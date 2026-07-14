"""fact_voyage roll-up identities + dim_port, and the carried daily positions."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import _price_index, compute_curated
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data import ports
from ym_datalake.synthetic_data.fleet import get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture(scope='module')
def curated_raw():
    """FL-AE (WELLNESS, waypoint legs) + FL-IA feeder (direct legs) over 2 years."""
    fleet = [get_vessel('9700006'), get_vessel('9700001')]
    orig = generate_module.FLEET
    generate_module.FLEET = fleet
    try:
        raw = generate(dt.date(2021, 7, 1), dt.date(2023, 6, 30), seed=7)
    finally:
        generate_module.FLEET = orig
    return compute_curated(raw), raw


def _noon_groups(raw):
    groups: dict[tuple[str, str], list[dict]] = {}
    for n in raw.noon_report:
        groups.setdefault((n['imo_number'], n['voyage_no']), []).append(n)
    return groups


def _voyage_index(curated):
    return {(v['imo_number'], v['voyage_no']): v for v in curated.fact_voyage}


# --- dim_port -------------------------------------------------------------


def test_dim_port_rows(curated_raw):
    curated, _ = curated_raw
    rows = {r['locode']: r for r in curated.dim_port}
    assert set(rows) == set(ports.PORTS)
    assert {lc for lc, r in rows.items() if r['is_eu']} == {'NLRTM', 'DEHAM'}
    for lc, r in rows.items():
        assert r['lat'] == ports.PORTS[lc]['lat']
        assert r['name'] == ports.PORTS[lc]['name']


# --- fact_voyage grain + roll-up identities -------------------------------


def test_grain_is_distinct_imo_voyage(curated_raw):
    curated, _ = curated_raw
    keys = [(v['imo_number'], v['voyage_no']) for v in curated.fact_voyage]
    assert len(keys) == len(set(keys))
    assert set(keys) == set(_noon_groups(curated_raw[1]))


def test_distance_and_foc_are_raw_sums(curated_raw):
    curated, raw = curated_raw
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        v = idx[key]
        assert v['distance_nm'] == pytest.approx(sum(r['distance_og_nm'] for r in recs))
        assert v['total_foc_mt'] == pytest.approx(sum(r['total_foc_mt'] for r in recs))
        assert v['sea_days'] == sum(1 for r in recs if r['voyage_phase'] == 'at_sea')


def test_avg_speed_is_distance_over_steaming_hours(curated_raw):
    curated, raw = curated_raw
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        v = idx[key]
        hours = sum(r['steaming_hours'] for r in recs if r['voyage_phase'] == 'at_sea')
        if hours > 0:
            assert v['avg_speed_kn'] == pytest.approx(v['distance_nm'] / hours)


def test_fuel_cost_prices_each_day_by_its_own_fuel_type(curated_raw):
    curated, raw = curated_raw
    prices = _price_index(raw.fuel_price)
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        expected = sum(
            r['total_foc_mt'] * prices.get((r['report_datetime_utc'][:10], r['fuel_type']), 0.0) for r in recs
        )
        assert idx[key]['fuel_cost_usd'] == pytest.approx(expected)


def test_usd_per_nm_is_cost_over_distance(curated_raw):
    curated, _ = curated_raw
    for v in curated.fact_voyage:
        if v['distance_nm'] > 0:
            assert v['usd_per_nm'] == pytest.approx(v['fuel_cost_usd'] / v['distance_nm'])
        else:
            assert v['usd_per_nm'] is None


def test_co2_reconciles_with_daily_fact(curated_raw):
    curated, raw = curated_raw
    daily_idx = {(d['imo_number'], d['report_date']): d for d in curated.fact_performance_daily}
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        imo = key[0]
        expected = sum(daily_idx[(imo, r['report_datetime_utc'][:10])]['co2_mt'] for r in recs)
        assert idx[key]['co2_mt'] == pytest.approx(expected)


def test_avg_speed_loss_is_mean_of_at_sea_daily(curated_raw):
    curated, raw = curated_raw
    daily_idx = {(d['imo_number'], d['report_date']): d for d in curated.fact_performance_daily}
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        imo = key[0]
        losses = [
            daily_idx[(imo, r['report_datetime_utc'][:10])]['speed_loss_pct']
            for r in recs
            if r['voyage_phase'] == 'at_sea'
            and daily_idx[(imo, r['report_datetime_utc'][:10])]['speed_loss_pct'] is not None
        ]
        v = idx[key]
        if losses:
            assert v['avg_speed_loss_pct'] == pytest.approx(sum(losses) / len(losses))
        else:
            assert v['avg_speed_loss_pct'] is None


def test_depart_and_arrive_bound_the_voyage(curated_raw):
    curated, raw = curated_raw
    idx = _voyage_index(curated)
    for key, recs in _noon_groups(raw).items():
        days = sorted(r['report_datetime_utc'][:10] for r in recs)
        v = idx[key]
        assert v['depart_date'] == days[0]
        assert v['arrive_date'] == days[-1]


def test_on_time_flag_matches_planned_eta_and_both_outcomes_occur(curated_raw):
    curated, _ = curated_raw
    outcomes = set()
    for v in curated.fact_voyage:
        actual_days = (dt.date.fromisoformat(v['arrive_date']) - dt.date.fromisoformat(v['depart_date'])).days
        planned_days = (dt.date.fromisoformat(v['planned_eta']) - dt.date.fromisoformat(v['depart_date'])).days
        assert v['on_time_flag'] == (actual_days <= planned_days)
        outcomes.add(v['on_time_flag'])
    assert outcomes == {True, False}  # ~half on-time by design


# --- carried daily positions ----------------------------------------------


def test_daily_rows_carry_position_on_both_branches(curated_raw):
    curated, _ = curated_raw
    phases = set()
    for r in curated.fact_performance_daily:
        assert r['latitude'] is not None and r['longitude'] is not None
        assert r['port_from'] and r['port_to'] and r['voyage_no']
        phases.add(r['voyage_phase'])
    assert {'at_sea', 'in_port'} <= phases
