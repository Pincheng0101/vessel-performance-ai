"""``curated.recommendation`` — the cost model, and the six defects that shipped without it.

Theil-Sen recovers an exact line exactly, so every fixture below is built as a literal line and
``beta`` is *known*, not approximated. That is what lets these tests assert on closed forms
(``T* = sqrt(2K/beta)``) instead of on remembered numbers.

Each regression test names the defect it pins and states the old, wrong behaviour, because every
one of them was live on the dashboard.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import recommendation, trends

K_UWC = recommendation.full_cost('UWC')
K_DD = recommendation.full_cost('DD')
K_PP = recommendation.full_cost('PP')


def daily(
    ship_id: str = 'S1',
    *,
    n: int = 40,
    first_day: int = 0,
    last_clean: int = 0,
    alpha: float = 100.0,
    beta: float = 10.0,
    loss_intercept: float = 1.0,
    loss_slope: float = 0.02,
    polish_clock_today: int = 0,
    dock_clock_today: int = 0,
    sfoc: float | None = None,
) -> list[dict]:
    """``n`` consecutive valid days, with ``excess_cost_usd = alpha + beta.t`` EXACTLY.

    ``t`` is cycle-time from ``last_clean`` — the same x-axis the module fits on. The ``*_today``
    clocks are the value the LAST row carries, since that is the row the recommender reads
    today's clock off.
    """
    rows = []
    for i in range(n):
        day = first_day + i
        t = float(day - last_clean)
        back = n - 1 - i
        rows.append(
            {
                'ship_id': ship_id,
                'noon_utc': day,
                'valid_flag': True,
                'speed_loss_pct': loss_intercept + loss_slope * t,
                'excess_cost_usd': alpha + beta * t,
                'sfoc_g_kwh': sfoc,
                'days_since_polish': polish_clock_today - back,
                'days_since_dry_dock': dock_clock_today - back,
            }
        )
    return rows


def uwi(
    ship_id: str = 'S1',
    *,
    day: int,
    polish_clock: int,
    roughness: float,
    dock_clock: int = 0,
    coating: float = 2.0,
    polish_censored: bool = False,
    dock_censored: bool = True,
    condition: str | None = None,
    cavitation: str | None = None,
) -> dict:
    return {
        'ship_id': ship_id,
        'inspection_day': day,
        'propeller_roughness_um': roughness,
        'coating_breakdown_pct': coating,
        'propeller_condition': condition,
        'hull_coating_condition': None,
        'cavitation_found': cavitation,
        'days_since_polish': polish_clock,
        'days_since_dry_dock': dock_clock,
        'polish_cycle_censored': polish_censored,
        'dry_dock_cycle_censored': dock_censored,
    }


def event(ship_id: str, day: int, event_type: str) -> dict:
    return {'ship_id': ship_id, 'event_day': day, 'event_type': event_type}


def plan(daily_rows, uwi_rows=(), anomalies=()) -> list[dict]:
    """The two builders wired the way ``compute`` wires them."""
    events = []
    recos = recommendation.build_recommendation(daily_rows, events)
    return recommendation.build_maintenance_recommendation(daily_rows, list(uwi_rows), list(anomalies), recos)


def action(rows: list[dict], ship_id: str, action_type: str) -> dict | None:
    return next((r for r in rows if r['ship_id'] == ship_id and r['action_type'] == action_type), None)


class TestTheClosedForm:
    def test_t_star_is_the_square_root_of_two_k_over_beta(self):
        """T* = sqrt(2K/beta), against `full_cost('UWC')` rather than a remembered 108000 — so the
        test still pins the model if the cost estimate is ever revised."""
        reco = recommendation.build_recommendation(daily(beta=10.0), [])[0]

        assert reco['cost_slope_usd_per_day2'] == pytest.approx(10.0)
        assert reco['t_star_days'] == pytest.approx((2.0 * K_UWC / 10.0) ** 0.5)
        assert reco['recommended_clean_day'] == round(reco['t_star_days'])

    def test_beta_is_fitted_on_the_open_cycle_alone(self):
        """The only cycle whose fouling you are still paying for. A steep, closed cycle before the
        last cleaning must not contaminate the slope of the open one."""
        closed = daily(n=40, first_day=0, last_clean=0, beta=50.0)
        open_cycle = daily(n=40, first_day=100, last_clean=100, beta=10.0)

        reco = recommendation.build_recommendation(closed + open_cycle, [event('S1', 100, 'UWC')])[0]

        assert reco['last_cleaning_day'] == 100
        assert reco['cost_slope_usd_per_day2'] == pytest.approx(10.0)

    def test_alpha_cancels_out_of_the_saving(self):
        """`net_saving` is an area between two cost RATES, and the fixed term sits in both. Two
        ships fouling identically but burning wildly different baselines must value the same."""
        cheap = recommendation.build_recommendation(daily('S1', alpha=100.0), [])[0]
        dear = recommendation.build_recommendation(daily('S2', alpha=9_000.0), [])[0]

        assert cheap['net_saving_usd'] == pytest.approx(dear['net_saving_usd'])

    @pytest.mark.parametrize(('n', 'status'), [(29, 'insufficient_history'), (30, 'ok'), (31, 'ok')])
    def test_the_cycle_needs_min_cycle_points(self, n, status):
        """Pins `<` and not `<=`: exactly MIN_CYCLE_POINTS points is enough."""
        assert recommendation.MIN_CYCLE_POINTS == 30
        assert recommendation.build_recommendation(daily(n=n), [])[0]['status'] == status

    @pytest.mark.parametrize('beta', [0.0, -5.0])
    def test_a_non_positive_beta_yields_no_model_rather_than_a_division_by_zero(self, beta):
        """T* = sqrt(2K/beta) is undefined for a hull whose cost is flat or FALLING. Guarded, not
        raised — a ship that is getting cheaper to run is a data story, not a crash."""
        reco = recommendation.build_recommendation(daily(beta=beta), [])[0]

        assert reco['status'] == 'insufficient_history'
        assert reco['t_star_days'] is None


class TestPriority:
    @pytest.mark.parametrize(
        ('horizon', 'expected'),
        [(0, 'high'), (30, 'high'), (31, 'medium'), (90, 'medium'), (91, 'low')],
    )
    def test_the_bands_are_closed_at_the_top(self, horizon, expected):
        assert recommendation._priority(due_day=1000 + horizon, last_day=1000, days_overdue=0) == expected

    def test_overdue_is_always_high_however_far_out_the_due_day_lands(self):
        """Redundant by construction once the due date is right — kept so the invariant is directly
        assertable and can never regress the way D1 did."""
        assert recommendation._priority(due_day=9999, last_day=1000, days_overdue=1) == 'high'


class TestD1OverdueInversion:
    """The most overdue ship in the fleet was ranked LOWEST priority.

    Old behaviour: `if due < last_day: due = trigger_eta_day`. S1's optimum was day 1267 and today
    was 1825 — 558 days overdue — so its due date was reset to the 8 % trigger ETA on day 2949, a
    horizon of 1,124 days, which lands in the `low` band. The fleet's most overdue ship, carrying
    its largest `net_saving`, sorted to the bottom of the planner.

    The fix is a deletion. Past T* every further day costs beta.u and there is nothing left to
    defer to, so the only defensible due date is the first day you can actually clean: today.
    """

    def _overdue(self):
        # beta=100 -> T* ~ 46 d, but the record runs 200 days past the last cleaning.
        return daily(n=200, beta=100.0, loss_slope=0.02)

    def test_an_overdue_hull_is_due_today_not_at_the_trigger(self):
        rows = self._overdue()
        last_day = rows[-1]['noon_utc']
        hull = action(plan(rows), 'S1', 'hull_cleaning')

        assert hull is not None
        assert hull['due_day'] == last_day
        assert hull['due_day'] < hull['trigger_eta_day']  # the old code set it TO the trigger
        assert hull['priority'] == 'high'

    def test_it_reports_how_overdue_it_is(self):
        rows = self._overdue()
        reco = recommendation.build_recommendation(rows, [])[0]

        hull = action(plan(rows), 'S1', 'hull_cleaning')

        assert reco['days_overdue'] == rows[-1]['noon_utc'] - reco['recommended_clean_day']
        assert hull is not None and hull['days_overdue'] == reco['days_overdue']


class TestD2UnboundedExtrapolation:
    """`net_saving` priced a counterfactual years past the last day of data.

    Old behaviour: the saving spanned T* all the way to the 8 % trigger, uncapped. S1's trigger sat
    1,968 days into the cycle — 3.1 years beyond the last observed day — and that artifact WAS its
    $3.75M headline. Perverse, too: the flatter the hull, the later the trigger, the bigger the
    "saving".

    The span is now capped at the forecast horizon the other actions already use. The trigger
    ETA itself is NOT capped: it forecasts a physical event and `alerts.py` consumes it as one.
    """

    def _flat_hull(self):
        # loss_slope 0.001 -> the 8 % trigger is ~7,000 days out, far past the 40 days of record.
        return daily(n=40, beta=10.0, loss_slope=0.001, loss_intercept=1.0)

    def test_the_saving_horizon_is_capped_at_the_forecast_horizon(self):
        reco = recommendation.build_recommendation(self._flat_hull(), [])[0]
        last_day, last_clean = 39, 0
        span_end = (last_day - last_clean) + recommendation.FORECAST_HORIZON_DAYS

        assert reco['saving_horizon_days'] == pytest.approx(span_end - reco['t_star_days'])

    def test_the_trigger_eta_is_left_untouched(self):
        """Truncating a forecast so a valuation looks better would make the column lie."""
        reco = recommendation.build_recommendation(self._flat_hull(), [])[0]

        assert reco['trigger_eta_day'] == pytest.approx((8.0 - 1.0) / 0.001, rel=1e-3)
        assert reco['trigger_eta_day'] > 39 + recommendation.FORECAST_HORIZON_DAYS

    def test_the_saving_is_far_below_the_uncapped_one(self):
        """net = beta.span^2/2, so cutting a 7,000-day span to ~400 removes almost all of it."""
        reco = recommendation.build_recommendation(self._flat_hull(), [])[0]
        uncapped_span = reco['trigger_eta_day'] - reco['t_star_days']
        uncapped = 10.0 * uncapped_span**2 / 2.0

        assert reco['net_saving_usd'] == pytest.approx(10.0 * reco['saving_horizon_days'] ** 2 / 2.0)
        assert reco['net_saving_usd'] < uncapped / 10.0

    def test_the_prospective_saving_prices_cleaning_today_instead(self):
        """`saving_if_cleaned_now_usd` = beta.u.365 - K — the number that actually answers "clean
        this ship now?", and the honest one to rank an overdue backlog by."""
        reco = recommendation.build_recommendation(daily(n=200, beta=100.0), [])[0]
        u = max(round(reco['t_star_days']), 199 - reco['last_cleaning_day'])

        assert reco['saving_if_cleaned_now_usd'] == pytest.approx(100.0 * u * 365 - K_UWC)


class TestD3AndD4TheStalePrePolishReading:
    """Two of fifteen ships carried a fabricated high-priority action.

    Old behaviour: the propeller trend was fitted against ABSOLUTE DAY across every polish in the
    record, and `current_value` was read straight off the latest inspection — which, for 31 of the
    43 UWI atoms, is the PRE-polish state that justified that very polish.

    Fitting in clock space and anchoring on the known post-reset value makes both defects
    unrepresentable rather than merely guarded against.
    """

    def test_a_propeller_polished_after_its_last_inspection_is_not_reported_as_dirty(self):
        """The S12 case. Its last inspection caught the propeller 300 days into a cycle, reading a
        genuinely dirty 310.9 um — which is exactly *why* the ship was polished afterwards. Today it
        is only 181 days past that polish.

        The old code read `current_value` straight off that last inspection and emitted
        `propeller_polishing` at priority HIGH — quoting 310.9 um as the current roughness of a
        propeller that had since been cleaned. The fit is now evaluated at TODAY's clock, so the
        reading that justified the polish can no longer be mistaken for the state after it.
        """
        rows = daily(n=40, first_day=1786, last_clean=1786, polish_clock_today=181)
        inspections = [
            uwi(day=1400, polish_clock=200, roughness=257.2),
            uwi(day=1572, polish_clock=300, roughness=310.9),  # pre-polish: the reason for the polish
        ]

        polish = action(plan(rows, inspections), 'S1', 'propeller_polishing')

        assert polish is not None
        assert polish['current_value'] == pytest.approx(150.0 + (310.9 - 150.0) / 300 * 181, rel=1e-3)
        assert polish['current_value'] < 310.9  # the stale reading is NOT the current state
        assert polish['current_value'] < polish['threshold_value']
        assert polish['priority'] != 'high'  # the old code said `high` on this exact ship

    def test_a_crossing_in_the_past_cannot_coexist_with_a_value_below_the_threshold(self):
        """The S11 phantom. Its last inspection was itself a `UWI+PP`, reading 222.6 um — 26 % BELOW
        its own 300 um threshold — yet the absolute-day fit put the crossing on day 283, in the
        past, and `max(due, last_day)` turned that into a HIGH priority action.

        Anchoring makes `current = R0 + g.t` and `eta = cycle_start + (threshold - R0)/g` the same
        line, so `current >= threshold` and `eta <= today` are now the SAME statement. The phantom
        is unrepresentable by construction, not blocked by a guard.
        """
        rows = daily(n=40, first_day=1786, last_clean=1786, polish_clock_today=115)
        inspections = [
            uwi(day=1600, polish_clock=100, roughness=210.0),
            uwi(day=1709, polish_clock=209, roughness=222.6),
        ]

        rows_out = plan(rows, inspections)
        last_day = rows[-1]['noon_utc']
        for row in rows_out:
            if row['action_type'] != 'propeller_polishing':
                continue
            breached = row['current_value'] >= row['threshold_value']
            crossed = row['trigger_eta_day'] <= last_day
            assert breached == crossed
            assert not (row['priority'] == 'high' and row['current_value'] < row['threshold_value'] and crossed)

    def test_the_roughness_rate_is_positive_where_the_propeller_is_actually_fouling(self):
        """Fitted against absolute day, 9 of 15 ships came out with a NEGATIVE roughness slope —
        the fit was reading noise across resets. In clock space, growth is growth."""
        rows = daily(n=40, first_day=1786, last_clean=1786, polish_clock_today=200)
        inspections = [
            uwi(day=1500, polish_clock=100, roughness=200.0),  # (200-150)/100 = 0.50
            uwi(day=1700, polish_clock=200, roughness=250.0),  # (250-150)/200 = 0.50
        ]

        polish = action(plan(rows, inspections), 'S1', 'propeller_polishing')

        assert polish is not None
        assert polish['degradation_rate'] == pytest.approx(0.5)
        assert polish['current_value'] == pytest.approx(150.0 + 0.5 * 200)  # the fit at TODAY's clock

    def test_a_point_too_soon_after_a_polish_is_not_fitted(self):
        """(y - R0)/x has enormous leverage at small x: a 30-day-old point 20 um off the origin
        would imply a slope three times the truth."""
        rows = daily(n=40, first_day=1786, last_clean=1786, polish_clock_today=200)
        inspections = [
            uwi(day=1500, polish_clock=100, roughness=200.0),
            uwi(day=1600, polish_clock=recommendation._MIN_FIT_CLOCK_DAYS - 1, roughness=400.0),  # excluded
        ]

        polish = action(plan(rows, inspections), 'S1', 'propeller_polishing')

        assert polish is not None
        assert polish['degradation_rate'] == pytest.approx(0.5)  # the wild point did not move it


class TestPropellerRepair:
    """Repair is damage, and damage is not forecast. A polish resets the clock, so extrapolating a
    roughness line THROUGH a polish until it reaches 430 um draws a trend across a reset."""

    def _rows(self):
        return daily(n=40, first_day=1786, last_clean=1786, polish_clock_today=200)

    def test_a_clean_well_graded_propeller_needs_no_repair(self):
        inspections = [uwi(day=1700, polish_clock=200, roughness=250.0, condition='Good')]
        assert action(plan(self._rows(), inspections), 'S1', 'propeller_repair') is None

    @pytest.mark.parametrize(
        ('kwargs', 'why'),
        [
            ({'roughness': 700.0}, 'the level is past 430 um'),
            ({'roughness': 250.0, 'condition': 'Poor'}, 'the real damage grade says Poor'),
            ({'roughness': 250.0, 'cavitation': 'Yes'}, 'cavitation was actually observed'),
        ],
    )
    def test_it_is_emitted_on_evidence_that_is_true_today(self, kwargs, why):
        inspections = [uwi(day=1700, polish_clock=200, **kwargs)]

        repair = action(plan(self._rows(), inspections), 'S1', 'propeller_repair')

        assert repair is not None, why
        assert repair['trigger_eta_day'] is None  # no forecast: damage is observed, not projected
        assert repair['priority'] == 'high'


class TestD5RepeatedFits:
    def test_no_series_is_ever_fitted_twice(self):
        """Theil-Sen is O(n^2) and `crossing_day` re-fits internally, so calling both on one series
        pays for the same fit twice. The docstring's "it runs once" was simply false."""
        seen: list[tuple] = []
        original = trends.theil_sen

        def counting(points):
            seen.append(tuple(points))
            return original(points)

        rows = daily(n=200, beta=100.0, sfoc=180.0)
        inspections = [uwi(day=100, polish_clock=100, roughness=200.0), uwi(day=180, polish_clock=180, roughness=240.0)]

        original_theil_sen = trends.theil_sen
        try:
            trends.theil_sen = counting
            plan(rows, inspections)
        finally:
            trends.theil_sen = original_theil_sen

        assert len(seen) == len(set(seen)), 'the same series was fitted more than once'


class TestD6DeadCode:
    def test_a_hull_with_no_usable_cost_model_still_reports_its_fouling_rate(self):
        """The fouling rate is a MEASUREMENT — a Theil-Sen slope of the real speed loss. A flat
        cost slope kills the economics; it does not un-measure the hull."""
        reco = recommendation.build_recommendation(daily(beta=0.0, loss_slope=0.02), [])[0]

        assert reco['status'] == 'insufficient_history'
        assert reco['net_saving_usd'] is None
        assert reco['fouling_rate_pct_per_day'] == pytest.approx(0.02)

    def test_the_priority_horizons_carry_no_unread_low_band(self):
        """`low` is the fall-through, and a constant nothing reads is a constant that can drift."""
        assert set(recommendation.PRIORITY_HORIZON_DAYS) == {'high', 'medium'}


class TestBatching:
    """`fold iff beta.u.(v-u) < K` — replacing a stipulated 60-day reach with a break-even.

    beta.u is today's excess burn rate, so the rule reads: the extra fuel burned while waiting is
    cheaper than the trip you would avoid.
    """

    def _ship(self, ship_id: str, beta: float, dock_in: int):
        """An OVERDUE hull, plus a coating renewal that anchors a dry dock `dock_in` days out.

        The inspection sits at a polish clock below `_MIN_FIT_CLOCK_DAYS`, so it raises no propeller
        action and the dock is anchored by the coating alone.
        """
        rows = daily(ship_id, n=200, beta=beta, dock_clock_today=1000, polish_clock_today=10)
        last_day = rows[-1]['noon_utc']
        # A coating fit that crosses 45 % exactly `dock_in` days from now: at clock c reading
        # 2 + 43.c/(c + dock_in), the anchored slope puts the crossing at c + dock_in.
        clock = 1000
        inspections = [
            uwi(
                ship_id,
                day=last_day - 1,
                polish_clock=10,
                roughness=155.0,
                dock_clock=clock,
                coating=2.0 + 43.0 * clock / (clock + dock_in),
                dock_censored=False,
            )
        ]
        return rows, inspections

    def test_an_overdue_hull_still_folds_into_an_imminent_dock(self):
        """The rule a T*-anchored break-even could never express. At u = T* it reduces to the tidy
        `v - T* < T*/2` — but you cannot clean in the past, and most of this fleet is already past
        its T*, so that whole window lies in history and would fold NOTHING. Anchoring on
        u = due_day - last_cleaning_day (= max(T*, days fouled today)) is what makes it work.

        beta=10, u=199, dock 6 days out: waiting costs 10 x 199 x 6 = $11,940, far below the
        $108,000 in-water trip it avoids. Fold.
        """
        rows, inspections = self._ship('S1', beta=10.0, dock_in=6)

        hull = action(plan(rows, inspections), 'S1', 'hull_cleaning')

        assert hull is not None
        assert hull['days_overdue'] > 0
        assert hull['plan_service_type'] == 'dry_dock'
        assert hull['action_cost_usd'] == 0.0  # the dock resets the hull anyway: genuinely free

    def test_two_ships_with_identical_geometry_but_different_beta_get_different_verdicts(self):
        """A fixed 60-day window cannot tell these apart — the geometry is identical, and both docks
        sit 40 days out. Only the cost model can: at beta=10 waiting costs 10 x 199 x 40 = $79,600
        (< $108,000, so fold), and at beta=50 it costs $398,000 (so make your own trip)."""
        slow_rows, slow_uwi = self._ship('S1', beta=10.0, dock_in=40)
        fast_rows, fast_uwi = self._ship('S2', beta=50.0, dock_in=40)

        slow = action(plan(slow_rows, slow_uwi), 'S1', 'hull_cleaning')
        fast = action(plan(fast_rows, fast_uwi), 'S2', 'hull_cleaning')

        assert slow is not None and fast is not None
        assert slow['due_day'] == fast['due_day']  # same geometry ...
        assert slow['plan_service_type'] == 'dry_dock'  # ... cheap to wait: fold
        assert fast['plan_service_type'] == 'in_water'  # ... expensive to wait: go now
        assert fast['action_cost_usd'] == pytest.approx(K_UWC)  # and it pays for its own trip

    def test_an_action_we_cannot_price_is_never_deferred(self):
        """There is no USD-per-micron coefficient for a propeller in this dataset, and inventing one
        would be inventing physics. So a polish may be pulled FORWARD onto a dock for free, but it
        may not slip past its own due date to catch one."""
        assert recommendation.UNPRICED_SLIP_DAYS == 0

        polish = {'action_type': 'propeller_polishing', 'due_day': 1000}
        reco = {'last_cleaning_day': 0, 'cost_slope_usd_per_day2': 10.0}

        assert recommendation._folds_into_dock(polish, anchor=990, reco=reco) is True  # forward: free
        assert recommendation._folds_into_dock(polish, anchor=1001, reco=reco) is False  # deferral: never

    def test_an_engine_inspection_needs_no_trip_so_folding_it_saves_nothing(self):
        """K is the TRIP AVOIDED, not "the action's cost". An engine inspection avoids no trip, so
        no non-negative deferral can ever be worth it. That falls out of the rule; it needs no
        special case."""
        survey = {'action_type': 'engine_inspection', 'due_day': 1000}
        reco = {'last_cleaning_day': 0, 'cost_slope_usd_per_day2': 10.0}

        assert recommendation._folds_into_dock(survey, anchor=990, reco=reco) is True
        assert recommendation._folds_into_dock(survey, anchor=1001, reco=reco) is False


class TestCosts:
    def test_a_dry_dock_window_is_charged_exactly_once(self):
        """THE DOUBLE-COUNT GUARD. `propeller_repair` and `coating_renewal` both require a dock;
        billing both would charge $3.56M for one $1.78M trip."""
        rows = daily(n=200, beta=1.0, dock_clock_today=2000, polish_clock_today=300)
        last_day = rows[-1]['noon_utc']
        inspections = [
            uwi(
                day=last_day - 1,
                polish_clock=300,
                roughness=500.0,  # past 430: repair
                dock_clock=2000,
                coating=60.0,  # past 45: renewal
                dock_censored=False,
                condition='Poor',
            )
        ]

        rows_out = plan(rows, inspections)
        dock = [r for r in rows_out if r['plan_service_type'] == 'dry_dock']

        assert {r['action_type'] for r in dock} >= {'propeller_repair', 'coating_renewal'}
        assert sum(r['action_cost_usd'] for r in dock) == pytest.approx(K_DD)
        assert len({r['window_id'] for r in dock}) == 1

    def test_action_costs_sum_to_the_window_cost_in_every_window(self):
        """The invariant that makes `action_cost_usd` safe to sum at any level, and `window_cost_usd`
        safe only after deduping on `window_id`."""
        rows = daily(n=200, beta=1.0, dock_clock_today=2000, polish_clock_today=300, sfoc=180.0)
        last_day = rows[-1]['noon_utc']
        inspections = [uwi(day=last_day - 1, polish_clock=300, roughness=500.0, dock_clock=2000, coating=60.0)]

        rows_out = plan(rows, inspections)

        by_window: dict[str, list[dict]] = {}
        for row in rows_out:
            by_window.setdefault(row['window_id'], []).append(row)
        for members in by_window.values():
            assert sum(m['action_cost_usd'] for m in members) == pytest.approx(members[0]['window_cost_usd'])

    def test_an_in_water_window_charges_each_distinct_event_once(self):
        """A cleaning and a polish in one window cost UWC + PP. Stated limit: that is an UPPER
        BOUND — `EVENT_COST_USD` has no notion of a diver mobilisation shared between the two."""
        cleaning = {'action_type': 'hull_cleaning', 'due_day': 100, 'ship_id': 'S1'}
        polish = {'action_type': 'propeller_polishing', 'due_day': 100, 'ship_id': 'S1'}
        for row in (cleaning, polish):
            row |= {'plan_day': 100, 'plan_service_type': 'in_water'}

        recommendation._charge([cleaning, polish])

        assert cleaning['action_cost_usd'] + polish['action_cost_usd'] == pytest.approx(K_UWC + K_PP)
        assert cleaning['window_cost_usd'] == pytest.approx(K_UWC + K_PP)
