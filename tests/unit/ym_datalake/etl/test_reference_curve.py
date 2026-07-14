"""``raw.reference_curve`` — the clean-hull curve every speed-loss number divides by.

The ``Curve`` dataclass is the pure, load-bearing core: ``clean_speed_kn`` is ISO 19030's
f_ref, and if its inverse is wrong then ``speed_loss_pct`` is wrong fleet-wide. The fit
itself (pooled exponent, per-ship scale) is exercised end-to-end by ``test_lake``; what is
worth pinning here is the algebra, the clean-window bookkeeping, and the refusal to fit on
too few points.

Note the signature trap: ``build`` takes ``vessels`` as a **list of dicts**, while
``clean_window_rows`` takes a **dict keyed by ship_id**.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.raw import reference_curve

CURVE = reference_curve.Curve(ref_curve_id='RC-S1', a=0.35, n=3.5, displacement_ref_t=166_500.0)


class TestCurve:
    def test_power_and_speed_are_inverses(self):
        power = CURVE.clean_power_kw(18.0, 160_000.0)
        assert CURVE.clean_speed_kn(power, 160_000.0) == pytest.approx(18.0)

    def test_power_scales_as_speed_to_the_exponent(self):
        one = CURVE.clean_power_kw(10.0, 166_500.0)
        two = CURVE.clean_power_kw(20.0, 166_500.0)
        assert two / one == pytest.approx(2.0**CURVE.n)

    def test_power_scales_as_displacement_to_the_two_thirds(self):
        light = CURVE.clean_power_kw(18.0, 100_000.0)
        heavy = CURVE.clean_power_kw(18.0, 200_000.0)
        assert heavy / light == pytest.approx(2.0 ** (2.0 / 3.0))

    def test_at_the_reference_displacement_the_scale_term_drops_out(self):
        assert CURVE.clean_power_kw(18.0, 166_500.0) == pytest.approx(0.35 * 18.0**3.5)

    @pytest.mark.parametrize(('power', 'displacement'), [(0.0, 166_500.0), (-1.0, 166_500.0), (25_000.0, 0.0)])
    def test_no_clean_speed_from_a_degenerate_input(self, power, displacement):
        assert CURVE.clean_speed_kn(power, displacement) is None


class TestCleanWindows:
    """A point counts only where the hull is *known* clean: the first 60 days of the record,
    and the 60 days after a real hull cleaning."""

    EVENTS = [
        {'ship_id': 'S1', 'event_type': 'UWC', 'event_day': 300},
        {'ship_id': 'S1', 'event_type': 'PP', 'event_day': 500},  # propeller only — no window
        {'ship_id': 'S2', 'event_type': 'DD', 'event_day': 700},  # another ship
    ]

    def test_the_record_opens_a_window_at_the_first_day(self):
        windows = reference_curve.clean_window_days('S1', [], first_day=10)
        assert windows == [(10, 10 + reference_curve.CLEAN_WINDOW_DAYS)]

    def test_a_hull_cleaning_opens_another(self):
        windows = reference_curve.clean_window_days('S1', self.EVENTS, first_day=10)
        assert windows == [(10, 70), (300, 360)]

    def test_a_propeller_polish_does_not_reset_the_hull(self):
        assert 'PP' not in reference_curve.HULL_CLEAN_EVENTS
        assert all(start != 500 for start, _end in reference_curve.clean_window_days('S1', self.EVENTS, 10))

    def test_another_ships_drydock_is_not_this_ships_window(self):
        assert reference_curve.clean_window_days('S1', self.EVENTS, 10) != reference_curve.clean_window_days(
            'S2', self.EVENTS, 10
        )
        assert (700, 760) in reference_curve.clean_window_days('S2', self.EVENTS, 10)

    def test_windows_come_out_in_day_order(self):
        events = [{'ship_id': 'S1', 'event_type': 'DD', 'event_day': day} for day in (900, 300)]
        starts = [start for start, _end in reference_curve.clean_window_days('S1', events, first_day=10)]
        assert starts == sorted(starts)

    def test_only_valid_rows_inside_a_window_are_fitted_on(self, noon_row, vessel):
        rows = [
            noon_row(noon_utc=5),  # valid, inside the opening window
            noon_row(noon_utc=200),  # valid, but the hull is 200 days old by then
            noon_row(noon_utc=310),  # valid, inside the post-UWC window
            noon_row(noon_utc=20, wind_scale=8.0),  # inside the window, but a gale
        ]
        kept = reference_curve.clean_window_rows(rows, self.EVENTS, {'S1': vessel})
        assert sorted(r['noon_utc'] for r in kept) == [5, 310]


class TestCurvesByShip:
    def test_keys_on_the_ship_and_carries_the_fitted_parameters(self):
        rows = [
            {
                'ref_curve_id': 'RC-S1',
                'ship_id': 'S1',
                'curve_a': 0.35,
                'curve_n': 3.5,
                'displacement_ref_t': 166_500.0,
                'speed_kn': speed,
            }
            for speed in (10.0, 20.0)  # 12 speed points per ship collapse to one Curve
        ]
        curves = reference_curve.curves_by_ship(rows)
        assert set(curves) == {'S1'}
        assert curves['S1'] == CURVE


def _power_law_points(speeds, a=4.2867, n=3.0, displacement=166_500.0, bias=1.0):
    """Points lying exactly on ``P = a . V^n`` at the reference displacement."""
    return [(v, bias * a * v**n, displacement) for v in speeds]


def _fit(points, displacement_ref_t=166_500.0) -> tuple[float, bool]:
    fit = reference_curve._fit_exponent(points, displacement_ref_t)
    assert fit is not None, 'the pool must be fittable — the test built it that way'
    return fit


class TestFitExponent:
    """The exponent is a slope over PER-SPEED-BIN MEDIANS, not over the raw points.

    The clean-window sample is badly unbalanced in speed (W2: 54 points at 15 kn, 5 at 13 kn),
    so a plain OLS slope is a slope through whichever speed the ships happened to sit at.
    """

    def test_recovers_the_exponent_of_a_clean_power_law(self):
        speeds = [v + offset for v in range(12, 20) for offset in (0.1, 0.3, 0.5, 0.7)]
        exponent, clamped = _fit(_power_law_points(speeds))
        assert exponent == pytest.approx(3.0, abs=1e-9)
        assert clamped is False

    def test_piling_points_into_one_speed_bin_does_not_move_the_exponent(self):
        """Density invariance: 47 more days at the same speed is not new evidence about the
        slope. Under the old all-points OLS the same pile moved it."""
        speeds = [v + offset for v in range(12, 19) for offset in (0.1, 0.3, 0.5, 0.7)]
        points = _power_law_points(speeds)
        # One speed bin reads 20 % high — a real possibility on a fleet that sits at one speed.
        clump = _power_law_points([19.1, 19.4, 19.7], bias=1.2)

        sparse, _ = _fit(points + clump)
        dense, _ = _fit(points + clump * 16)
        assert dense == pytest.approx(sparse, abs=1e-9), 'the binned fit weighs the bin, not the days in it'

        xs, ys = reference_curve._log_space(points + clump * 16, 166_500.0)
        assert reference_curve._slope(xs, ys) != pytest.approx(dense, abs=0.05), 'OLS is dragged by the clump'

    def test_a_pool_too_sparse_to_bin_falls_back_to_all_points(self):
        """Two speeds cannot fill MIN_FIT_BINS bins, but 30+ points still fit a line."""
        points = _power_law_points([12.0] * 15 + [18.0] * 15)
        exponent, _ = _fit(points)
        xs, ys = reference_curve._log_space(points, 166_500.0)
        assert exponent == pytest.approx(reference_curve._slope(xs, ys))

    def test_a_railed_slope_is_reported_as_clamped(self):
        """CURVE_N_BOUNDS is an absurdity guard. If it ever binds, the row must say so —
        nothing downstream may read a rail value as a fit."""
        speeds = [v + offset for v in range(12, 20) for offset in (0.1, 0.3, 0.5, 0.7)]
        exponent, clamped = _fit(_power_law_points(speeds, n=8.0))
        assert exponent == reference_curve.CURVE_N_BOUNDS[1]
        assert clamped is True


class TestBuild:
    def test_a_thin_ship_falls_back_to_a_pool_that_can_actually_fit_a_scale(self, noon_row, vessel):
        """S22 is the only W2-P1 ship, so its variant pool *is* its own single point — non-empty,
        and just as unfittable. Cascading on emptiness handed that one point back and published
        the fit it trivially achieves against itself (fit_rmse_pct = 0.0 %)."""
        sister = vessel | {'ship_id': 'S22', 'propeller_variant': 'P2'}

        rows = []
        for i in range(40):  # S1: enough of its own points to fit the pooled exponent
            speed = 12.0 + (i % 8)
            wobble = 1.0 + 0.05 * ((i % 3) - 1)
            rows.append(
                noon_row(
                    noon_utc=i,
                    speed_through_water=speed,
                    horse_power=wobble * 4.2867 * speed**3.0,
                )
            )
        # S22: one clean-window day, and a 30 %-high power reading on it.
        rows.append(noon_row(ship_id='S22', noon_utc=5, speed_through_water=18.0, horse_power=1.3 * 4.2867 * 18.0**3.0))

        curves = reference_curve.build(rows, [], [vessel, sister], power_key='horse_power')
        s1 = [r for r in curves if r['ship_id'] == 'S1']
        s22 = [r for r in curves if r['ship_id'] == 'S22']

        assert s22[0]['n_fit_points'] == 1, "the ship's own evidence is still reported as one day"
        assert s22[0]['fit_rmse_pct'] > 0.0, 'a curve fitted against a single point cannot be a perfect fit'
        # Both ships sit on the same speed grid, so the curves compare point for point. S22's
        # one day reads 30 % high; a curve that had been handed it back would sit 30 % above
        # the class. (curve_a alone is not comparable — the two ships' exponents differ.)
        for mine, sister_row in zip(s22, s1):
            assert mine['shaft_power_kw'] == pytest.approx(sister_row['shaft_power_kw'], rel=0.1)

    def test_a_pool_too_thin_to_fit_an_exponent_raises(self, noon_row, vessel):
        """Every ISO 19030 number hangs off this fit, so it fails loudly rather than
        quietly fitting a slope through noise."""
        rows = [noon_row(noon_utc=day) for day in range(5)]
        assert len(rows) < reference_curve.MIN_FIT_POINTS

        with pytest.raises(ValueError, match='clean-window valid points'):
            reference_curve.build(rows, [], [vessel], power_key='horse_power')

    def test_no_clean_window_rows_at_all_raises(self, vessel):
        with pytest.raises(ValueError, match='clean-window valid points'):
            reference_curve.build([], [], [vessel], power_key='horse_power')
