"""§5.4/§5.5 maintenance-effect enrichment + cleaning-recommendation tests."""

import datetime as dt

import pytest

from ym_datalake.etl import recommendation, trends
from ym_datalake.etl.compute import compute_curated
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture
def curated(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO), FLEET[0]])
    raw = generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=7)
    return compute_curated(raw)


def test_recommendation_one_per_vessel(curated):
    recs = {r['imo_number']: r for r in curated.fact_recommendation}
    assert set(recs) == {WELLNESS_IMO, FLEET[0].imo_number}


def test_actionable_recommendations_are_sensible(curated):
    actionable = [r for r in curated.fact_recommendation if r['status'] == 'ok']
    assert actionable, 'expected at least one actionable recommendation'
    for r in actionable:
        # Clean in the future of the last cleaning, with a positive fouling rate and horizon.
        assert r['recommended_clean_date'] > r['last_cleaning_date']
        assert r['t_star_days'] > 0
        assert r['fouling_rate_pct_per_day'] > 0
        if r['trigger_eta'] is not None:
            assert r['trigger_eta'] > r['last_cleaning_date']


def test_wellness_recommendation_actionable(curated):
    wellness = next(r for r in curated.fact_recommendation if r['imo_number'] == WELLNESS_IMO)
    # The engineered YM WELLNESS fouling arc has a clear open-cycle trend to optimise.
    assert wellness['status'] == 'ok'
    assert wellness['net_saving_usd'] is None or wellness['net_saving_usd'] > 0


def test_hull_cleaning_recovery_enriched(curated):
    cleanings = [
        e
        for e in curated.fact_maintenance_event
        if e['event_type'] == 'hull_cleaning' and e['me_recovery_pct'] is not None
    ]
    assert cleanings, 'expected ME recovery enriched on hull cleanings'
    # Cleaning should, on the whole, recover speed loss (positive ME).
    assert sum(e['me_recovery_pct'] > 0 for e in cleanings) / len(cleanings) >= 0.5


def _row(date: str, dsc: int, cost: float | None) -> dict:
    return {
        'imo_number': FLEET[0].imo_number,
        'report_date': date,
        'days_since_cleaning': dsc,
        'speed_loss_pct': 3.0,
        'valid_flag': True,
        'excess_cost_usd': cost,
    }


def test_recommend_thin_open_cycle_is_placeholder():
    # Fewer than the minimum open-cycle points → an insufficient-history placeholder.
    start, end = dt.date(2021, 1, 1), dt.date(2022, 1, 1)
    rows = [_row((start + dt.timedelta(days=i)).isoformat(), 100 + i, 500.0 + i) for i in range(10)]
    seg = trends.Segment(start, end, slope=0.01, intercept=2.0, ci_lo=0.005, ci_hi=0.02, n=10, open_cycle=True)
    rec = recommendation.recommend(rows, [], FLEET[0], [seg], fleet_k=80000.0)
    assert rec['status'] == 'insufficient_history'
    assert rec['recommended_clean_date'] is None
    assert rec['last_cleaning_date'] is not None  # still reconstructed from the open cycle


# --- recommend_actions (per-action forecast models) -------------------------

_IMO = '9700001'
_PROP_EDGES = (210.0, 270.0, 330.0, 390.0, 470.0)


def _rubert(roughness: float) -> str:
    return 'ABCDEF'[sum(roughness >= e for e in _PROP_EDGES)]


def _coating(breakdown: float) -> str:
    return 'poor' if breakdown >= 45 else 'fair' if breakdown >= 20 else 'good'


def _uwi(date: dt.date, roughness: float, breakdown: float, *, rating=10) -> dict:
    return {
        'inspection_id': f'UWI-{_IMO}-{date.isoformat()}',
        'imo_number': _IMO,
        'inspection_date': date.isoformat(),
        'inspection_type': 'UWI',
        'hull_fouling_rating': rating,
        'hull_fouling_coverage_pct': 0.0,
        'propeller_condition': _rubert(roughness),
        'propeller_roughness_um': roughness,
        'coating_breakdown_pct': breakdown,
        'coating_condition': _coating(breakdown),
        'recommended_action': 'none',
    }


def _dates(start: dt.date, n: int, step: int = 30) -> list[dt.date]:
    return [start + dt.timedelta(days=i * step) for i in range(n)]


def _daily(dates: list[dt.date], sfoc) -> list[dict]:
    return [
        {
            'imo_number': _IMO,
            'report_date': d.isoformat(),
            'valid_flag': True,
            'sfoc_g_kwh': (sfoc[i] if isinstance(sfoc, list) else sfoc),
        }
        for i, d in enumerate(dates)
    ]


def _anom(cause, *, severity='medium', date='2023-11-15') -> dict:
    return {
        'imo_number': _IMO,
        'report_date': date,
        'metric': 'slip',
        'value': 0.0,
        'z_score': 0.0,
        'severity': severity,
        'cause': cause,
    }


def _rec(status='insufficient_history', **kw) -> dict:
    base = {
        'imo_number': _IMO,
        'last_cleaning_date': '2023-01-01',
        'recommended_clean_date': None,
        'trigger_eta': None,
        't_star_days': None,
        'fouling_rate_pct_per_day': None,
        'net_saving_usd': None,
        'status': status,
    }
    base.update(kw)
    return base


_START = dt.date(2023, 1, 1)
_UWI_DAYS = (0, 90, 180)


def _by_type(actions: list[dict]) -> dict[str, dict]:
    return {a['action_type']: a for a in actions}


# --- the shared fitted-forecast helper --------------------------------------


def test_forecast_cross_orders_polish_before_repair():
    reset = dt.date(2024, 1, 1)
    pts = [(0.0, 150.0), (90.0, 195.0), (180.0, 240.0)]  # 150µm + 0.5µm/day
    polish = recommendation._forecast_cross(reset, pts, 300.0)
    repair = recommendation._forecast_cross(reset, pts, 430.0)
    assert polish is not None and repair is not None
    assert polish < repair  # reaches the polish band (300) before the repair band (430)
    assert dt.date.fromisoformat(polish) == reset + dt.timedelta(days=300)


def test_forecast_cross_flat_or_thin_returns_none():
    reset = dt.date(2024, 1, 1)
    assert recommendation._forecast_cross(reset, [(0, 150.0), (90, 150.0)], 300.0) is None  # flat
    assert recommendation._forecast_cross(reset, [(0, 150.0)], 300.0) is None  # one point


# --- recommend_actions integration ------------------------------------------


def test_recommend_actions_empty_when_up_to_date():
    # Freshly serviced: flat/low signals, no anomalies, no cost model → nothing due.
    uwi = [_uwi(_START + dt.timedelta(days=d), 155.0, 4.0) for d in _UWI_DAYS]
    daily = _daily(_dates(_START, 7), 180.0)
    assert recommendation.recommend_actions(uwi, [], _rec(), daily, []) == []


def test_hull_cleaning_from_cost_model_high_when_trigger_soon():
    rec = _rec(status='ok', recommended_clean_date='2024-08-01', trigger_eta='2024-07-15', t_star_days=70.0)
    daily = [{'imo_number': _IMO, 'report_date': '2024-06-30', 'valid_flag': True, 'sfoc_g_kwh': 180.0}]
    hull = _by_type(recommendation.recommend_actions([_uwi(dt.date(2024, 3, 1), 155.0, 4.0)], [], rec, daily, []))[
        'hull_cleaning'
    ]
    assert hull['priority'] == 'high'  # trigger ETA within ~60d of the latest report date
    assert hull['due_date'] == '2024-08-01'
    assert hull['source'] == 'fouling_model'


def test_hull_cleaning_overdue_shows_future_due_not_past():
    # Cost-optimal clean date lands in the past (overdue); the trigger ETA is still future.
    rec = _rec(status='ok', recommended_clean_date='2024-03-01', trigger_eta='2024-09-01', t_star_days=70.0)
    daily = [{'imo_number': _IMO, 'report_date': '2024-06-30', 'valid_flag': True, 'sfoc_g_kwh': 180.0}]
    hull = _by_type(recommendation.recommend_actions([_uwi(dt.date(2024, 3, 1), 155.0, 4.0)], [], rec, daily, []))[
        'hull_cleaning'
    ]
    assert hull['due_date'] > '2024-06-30'  # future due, not the past 2024-03-01
    assert hull['due_date'] == '2024-09-01'  # the 8% speed-loss trigger deadline
    assert 'overdue' in hull['rationale']
    assert hull['priority'] == 'medium'  # trigger ETA 63d out (> ~60d), so not high
    assert hull['source'] == 'fouling_model'


def test_hull_cleaning_from_uwi_rating_gets_horizon_due():
    # status != ok but a high UWI rating still warrants cleaning — now with a horizon due.
    daily = [{'imo_number': _IMO, 'report_date': '2024-06-30', 'valid_flag': True, 'sfoc_g_kwh': 180.0}]
    hull = _by_type(
        recommendation.recommend_actions([_uwi(dt.date(2024, 3, 1), 155.0, 4.0, rating=70)], [], _rec(), daily, [])
    )['hull_cleaning']
    assert hull['priority'] == 'medium'
    assert hull['source'] == 'uwi'
    assert hull['due_date'] == '2024-09-28'  # latest report + 90d


def test_propeller_polish_forecast_gives_future_due():
    # Roughness rising toward but below the polish band → a genuine future polish date.
    uwi = [_uwi(_START + dt.timedelta(days=d), 150.0 + 0.5 * d, 4.0) for d in _UWI_DAYS]
    daily = _daily(_dates(_START, 7), 180.0)
    actions = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, []))
    pol = actions['propeller_polishing']
    assert pol['priority'] == 'medium'
    assert pol['due_date'] > daily[-1]['report_date']  # forecast is in the future
    assert 'propeller_repair' not in actions


def test_propeller_repair_when_already_rough_suppresses_polishing():
    uwi = [_uwi(_START + dt.timedelta(days=d), 400.0 + 0.2 * d, 4.0) for d in _UWI_DAYS]  # latest ~436µm (grade E)
    daily = _daily(_dates(_START, 7), 180.0)
    actions = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, []))
    assert 'propeller_repair' in actions
    assert 'propeller_polishing' not in actions
    assert actions['propeller_repair']['priority'] == 'high'
    assert actions['propeller_repair']['due_date'] is not None  # past crossing → horizon fallback


def test_propeller_repair_on_high_severity_anomaly():
    uwi = [_uwi(_START + dt.timedelta(days=d), 200.0, 4.0) for d in _UWI_DAYS]  # mild grade B
    daily = _daily(_dates(_START, 7), 180.0)
    latest = dt.date.fromisoformat(daily[-1]['report_date'])
    anoms = [_anom('propeller', severity='high', date=(latest - dt.timedelta(days=20)).isoformat())]
    actions = _by_type(recommendation.recommend_actions(uwi, anoms, _rec(), daily, []))
    assert actions['propeller_repair']['source'] == 'anomaly'
    assert 'propeller_polishing' not in actions


def test_propeller_forecast_anchors_at_latest_polish():
    # A propeller_polishing event resets the clock — the forecast anchors after it.
    polish = _START + dt.timedelta(days=120)
    events = [{'imo_number': _IMO, 'event_date': polish, 'event_type': 'propeller_polishing'}]
    uwi = [
        _uwi(_START + dt.timedelta(days=60), 200.0, 4.0),  # pre-polish
        _uwi(_START + dt.timedelta(days=180), 180.0, 4.0),  # post-polish, rising again
        _uwi(_START + dt.timedelta(days=300), 240.0, 4.0),
    ]
    daily = _daily(_dates(_START, 11), 180.0)
    pol = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, events))['propeller_polishing']
    assert pol['due_date'] > polish.isoformat()


def test_coating_renewal_forecast_gives_future_due():
    uwi = [_uwi(_START + dt.timedelta(days=d), 155.0, 0.15 * d) for d in _UWI_DAYS]  # breakdown rising
    daily = _daily(_dates(_START, 7), 180.0)
    coat = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, []))['coating_renewal']
    assert coat['priority'] == 'medium'
    assert coat['source'] == 'uwi'
    assert coat['due_date'] > daily[-1]['report_date']


def test_engine_inspection_from_sfoc_drift_gives_future_due():
    dates = _dates(_START, 13)
    sfoc = [175.0 + 0.02 * (d - _START).days for d in dates]  # slow drift, +5% still ahead
    daily = _daily(dates, sfoc)
    uwi = [_uwi(_START + dt.timedelta(days=d), 155.0, 4.0) for d in (0, 180, 360)]
    eng = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, []))['engine_inspection']
    assert eng['priority'] == 'medium'
    assert eng['source'] == 'sfoc_trend'
    assert eng['due_date'] > daily[-1]['report_date']


def test_engine_inspection_high_with_anomaly_uses_horizon():
    dates = _dates(_START, 13)
    daily = _daily(dates, 180.0)  # flat SFOC → drift trend degenerate
    uwi = [_uwi(_START + dt.timedelta(days=d), 155.0, 4.0) for d in (0, 180, 360)]
    latest = dt.date.fromisoformat(daily[-1]['report_date'])
    anoms = [_anom('engine_degradation', date=(latest - dt.timedelta(days=20)).isoformat())]
    eng = _by_type(recommendation.recommend_actions(uwi, anoms, _rec(), daily, []))['engine_inspection']
    assert eng['priority'] == 'high'
    assert eng['source'] == 'anomaly'
    assert eng['due_date'] == (latest + dt.timedelta(days=30)).isoformat()  # horizon fallback


def test_engine_anomaly_outside_window_ignored():
    dates = _dates(_START, 13)
    daily = _daily(dates, 180.0)
    uwi = [_uwi(_START + dt.timedelta(days=d), 155.0, 4.0) for d in (0, 180, 360)]
    old = [_anom('engine_degradation', date='2022-01-01')]  # long before the window
    assert 'engine_inspection' not in _by_type(recommendation.recommend_actions(uwi, old, _rec(), daily, []))


# --- per-action analytics (parity with hull cleaning) -----------------------

_ACTION_UNITS = {
    'hull_cleaning': '%/day',
    'propeller_polishing': 'µm/day',
    'propeller_repair': 'µm/day',
    'coating_renewal': '%/day',
    'engine_inspection': '%/day',
}
_ACTION_THRESHOLDS = {
    'hull_cleaning': 8.0,
    'propeller_polishing': 300.0,
    'propeller_repair': 430.0,
    'coating_renewal': 45.0,
    'engine_inspection': 5.0,
}


def test_action_rows_carry_units_thresholds_and_saving_sign(curated):
    rows = curated.fact_maintenance_recommendation
    assert rows, 'expected some maintenance actions on the synthetic fleet'
    for a in rows:
        at = a['action_type']
        assert a['threshold_value'] == _ACTION_THRESHOLDS[at]
        if a['degradation_rate'] is not None:  # unit accompanies every reported rate
            assert a['degradation_unit'] == _ACTION_UNITS[at]
        if at == 'propeller_repair':  # corrective floor — rate + ETA only, never economics
            assert a['t_star_days'] is None and a['net_saving_usd'] is None
        if a['net_saving_usd'] is not None:  # servicing at t* vs the trigger only ever saves
            assert a['net_saving_usd'] > 0
            assert a['t_star_days'] is not None and a['t_star_days'] > 0


def test_hull_action_mirrors_cost_model(curated):
    hull = [a for a in curated.fact_maintenance_recommendation if a['action_type'] == 'hull_cleaning']
    assert hull, 'expected a hull cleaning action on the synthetic fleet'
    recs = {r['imo_number']: r for r in curated.fact_recommendation}
    for a in hull:
        rec = recs[a['imo_number']]
        assert a['degradation_unit'] == '%/day'
        assert a['threshold_value'] == 8.0
        # hull row self-carries the vessel's fouling cost model (no join to fact_recommendation).
        assert a['degradation_rate'] == rec['fouling_rate_pct_per_day']
        assert a['trigger_eta'] == rec['trigger_eta']
        assert a['t_star_days'] == rec['t_star_days']
        assert a['net_saving_usd'] == rec['net_saving_usd']


def _priced_daily(dates: list[dt.date]) -> list[dict]:
    # Valid daily rows with the fields _foc_price needs: FOC≈sfoc·power·24h, price=cost/foc.
    return [
        {
            'imo_number': _IMO,
            'report_date': d.isoformat(),
            'valid_flag': True,
            'sfoc_g_kwh': 180.0,
            'power_corrected_kw': 40000.0,
            'excess_foc_mt': 2.0,
            'excess_cost_usd': 1200.0,  # → 600 $/mt
        }
        for d in dates
    ]


def test_coating_economics_emit_positive_net_saving():
    # Breakdown rising to a within-horizon 45% crossing, priced daily rows, and a
    # coating_renewal event cost → coefficient economics emit t* and a positive net saving.
    daily = _priced_daily(_dates(_START, 24, step=30))  # days 0..690
    uwi = [_uwi(d, 155.0, 0.06 * (d - _START).days) for d in _dates(_START, 6, step=120)]  # ~0.06 %/day
    events = [
        {'imo_number': _IMO, 'event_date': _START, 'event_type': 'coating_renewal', 'cost_usd': 800000.0},
    ]
    coat = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, events))['coating_renewal']
    assert coat['degradation_unit'] == '%/day'
    assert coat['threshold_value'] == 45.0
    assert coat['degradation_rate'] > 0
    assert coat['current_value'] is not None
    assert coat['trigger_eta'] > daily[-1]['report_date']  # 45% crossing forecast in the future
    assert coat['t_star_days'] is not None and coat['t_star_days'] > 0
    assert coat['net_saving_usd'] is not None and coat['net_saving_usd'] > 0


def test_economics_need_event_cost_fallback():
    # Same rising-breakdown scenario but no matching event and no fleet fallback → the
    # rate/ETA still populate, but t*/net_saving stay null (K unavailable).
    daily = _priced_daily(_dates(_START, 24, step=30))
    uwi = [_uwi(d, 155.0, 0.06 * (d - _START).days) for d in _dates(_START, 6, step=120)]
    coat = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, []))['coating_renewal']
    assert coat['degradation_rate'] > 0  # grounded rate still reported
    assert coat['t_star_days'] is None and coat['net_saving_usd'] is None
    # A fleet-median K then unlocks the economics without any vessel-local event.
    coat2 = _by_type(recommendation.recommend_actions(uwi, [], _rec(), daily, [], {'coating_renewal': 800000.0}))[
        'coating_renewal'
    ]
    assert coat2['t_star_days'] is not None and coat2['net_saving_usd'] > 0


# --- consolidated maintenance planner (plan_maintenance) ---------------------


def _act(action_type: str, due: str | None, priority: str = 'medium') -> dict:
    return {'imo_number': _IMO, 'action_type': action_type, 'priority': priority, 'due_date': due}


def test_plan_maintenance_empty():
    assert recommendation.plan_maintenance([]) == []


def test_plan_batches_dry_dock_within_60d_and_splits_beyond():
    # Two dry-dock actions 45d apart batch into one window; a third 91d out splits off.
    together = recommendation.plan_maintenance(
        [_act('coating_renewal', '2024-01-01'), _act('propeller_repair', '2024-02-15')]
    )
    assert {a['plan_date'] for a in together} == {'2024-01-01'}  # earliest dry-dock due
    assert {a['plan_service_type'] for a in together} == {'dry_dock'}

    apart = {
        a['action_type']: a['plan_date']
        for a in recommendation.plan_maintenance(
            [_act('coating_renewal', '2024-01-01'), _act('propeller_repair', '2024-04-01')]
        )
    }
    assert apart['coating_renewal'] == '2024-01-01'
    assert apart['propeller_repair'] == '2024-04-01'


def test_plan_in_water_folds_into_dock_window_anchored_on_dock_due():
    # An in-water hull cleaning 10d before a dock folds in, but the window plan_date stays
    # the dock's due (the dock is the constraining event; not pulled earlier).
    by = _by_type(
        recommendation.plan_maintenance([_act('coating_renewal', '2024-03-01'), _act('hull_cleaning', '2024-02-20')])
    )
    assert by['coating_renewal']['plan_date'] == '2024-03-01'
    assert by['hull_cleaning']['plan_date'] == '2024-03-01'  # not the earlier 2024-02-20
    assert by['hull_cleaning']['plan_service_type'] == 'dry_dock'


def test_plan_urgent_in_water_far_before_dock_forms_own_window():
    # An urgent hull cleaning 8 months before a distant dock is not deferred to the dock.
    by = _by_type(
        recommendation.plan_maintenance([_act('hull_cleaning', '2024-01-01'), _act('coating_renewal', '2024-09-01')])
    )
    assert by['hull_cleaning']['plan_date'] == '2024-01-01'
    assert by['hull_cleaning']['plan_service_type'] == 'in_water'
    assert by['coating_renewal']['plan_date'] == '2024-09-01'
    assert by['coating_renewal']['plan_service_type'] == 'dry_dock'


def test_plan_batches_in_water_among_themselves():
    by = _by_type(
        recommendation.plan_maintenance(
            [
                _act('hull_cleaning', '2024-01-01'),
                _act('propeller_polishing', '2024-01-20'),  # within 60d → same in-water window
                _act('engine_inspection', '2024-05-01'),  # far → its own in-water window
            ]
        )
    )
    assert by['hull_cleaning']['plan_date'] == by['propeller_polishing']['plan_date'] == '2024-01-01'
    assert by['engine_inspection']['plan_date'] == '2024-05-01'
    assert all(a['plan_service_type'] == 'in_water' for a in by.values())


def test_plan_window_service_type_and_priority_aggregation():
    # A mixed-priority window shares one service_type; its max priority (high>medium>low) is high.
    planned = recommendation.plan_maintenance(
        [
            _act('coating_renewal', '2024-03-01', priority='medium'),
            _act('propeller_repair', '2024-03-10', priority='high'),
            _act('hull_cleaning', '2024-03-05', priority='low'),  # folds into the dock window
        ]
    )
    assert len({a['plan_date'] for a in planned}) == 1  # one window
    assert {a['plan_service_type'] for a in planned} == {'dry_dock'}
    rank = {'high': 0, 'medium': 1, 'low': 2}
    assert min((a['priority'] for a in planned), key=lambda p: rank[p]) == 'high'


def test_curated_actions_carry_plan_window(curated):
    rows = curated.fact_maintenance_recommendation
    assert rows, 'expected some maintenance actions on the synthetic fleet'
    for a in rows:
        assert a['plan_date'] is not None
        assert a['plan_service_type'] in ('dry_dock', 'in_water')
    # Within a vessel, rows sharing a plan_date share a plan_service_type (one window = one type).
    by_window: dict[tuple[str, str], set[str]] = {}
    for a in rows:
        by_window.setdefault((a['imo_number'], a['plan_date']), set()).add(a['plan_service_type'])
    assert all(len(types) == 1 for types in by_window.values())
