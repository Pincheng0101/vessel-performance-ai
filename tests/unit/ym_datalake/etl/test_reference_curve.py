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
    def test_keys_on_the_ship_and_carries_the_fitted_parameters(self, vessel):
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
        curves = reference_curve.curves_by_ship(rows, [vessel])
        assert set(curves) == {'S1'}
        assert curves['S1'] == CURVE


class TestBuild:
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
