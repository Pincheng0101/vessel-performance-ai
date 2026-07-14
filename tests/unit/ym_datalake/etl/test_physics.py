"""The 13 pure functions of ``etl.physics``.

Every assertion here is the *documented* contract — a sign convention, a taper, a closed
form, a degenerate denominator — never a float read back off a run. A golden number would
pass forever; these fail the moment the physics moves.
"""

from __future__ import annotations

import math

import pytest

from ym_datalake.etl import physics


class TestDocumentedConstants:
    """The tests below compose these constants into closed forms, so they would follow a
    constant wherever it moved. These pin the values themselves — every one is a cited
    standard (ITTC, ISO 15016, Blendermann 1994), not a tuning knob."""

    def test_fluid_and_unit_constants(self):
        assert physics.RHO_SW_KG_M3 == 1025.0  # ITTC standard seawater
        assert physics.RHO_AIR_KG_M3 == 1.225  # air at 15 C
        assert physics.GRAVITY_M_S2 == 9.81
        assert physics.KN_TO_MS == 0.514444

    def test_propulsive_efficiency(self):
        """0.70 — the design figure for a single-screw container ship with an FPP."""
        assert physics.PROPULSIVE_EFFICIENCY == 0.70

    def test_blendermann_head_wind_coefficient(self):
        assert physics.C_AA_HEAD == 0.85

    def test_the_compass_has_sixteen_points(self):
        assert physics.COMPASS_POINTS == 16
        assert physics.DEG_PER_POINT == 22.5


class TestCompass:
    """The source's directions are 16-point indices, not degrees. Everything starts here."""

    @pytest.mark.parametrize(('point', 'deg'), [(0, 0.0), (4, 90.0), (7, 157.5), (8, 180.0), (12, 270.0)])
    def test_compass_to_deg(self, point, deg):
        assert physics.compass_to_deg(point) == pytest.approx(deg)

    def test_compass_wraps_at_16_points(self):
        assert physics.compass_to_deg(physics.COMPASS_POINTS) == pytest.approx(0.0)
        assert physics.compass_to_deg(physics.COMPASS_POINTS + 4) == pytest.approx(90.0)

    def test_compass_passes_none_through(self):
        assert physics.compass_to_deg(None) is None

    @pytest.mark.parametrize(
        ('direction', 'heading', 'relative'),
        [
            (0.0, 0.0, 0.0),  # dead ahead
            (270.0, 0.0, 90.0),  # folds to the 0-180 side
            (180.0, 0.0, 180.0),  # astern
            (10.0, 350.0, 20.0),  # across the 0/360 seam
            (350.0, 10.0, 20.0),  # and back the other way — folding is symmetric
        ],
    )
    def test_relative_angle_folds_to_0_180(self, direction, heading, relative):
        assert physics.relative_angle_deg(direction, heading) == pytest.approx(relative)


class TestApparentWind:
    def test_a_stationary_ship_sees_the_true_wind(self):
        speed_ms, angle = physics.apparent_wind(true_wind_kn=20.0, wind_angle_deg=40.0, stw_kn=0.0)
        assert speed_ms == pytest.approx(20.0 * physics.KN_TO_MS)
        assert angle == pytest.approx(40.0)

    def test_the_ships_own_motion_adds_to_a_head_wind(self):
        speed_ms, angle = physics.apparent_wind(true_wind_kn=10.0, wind_angle_deg=0.0, stw_kn=15.0)
        assert speed_ms == pytest.approx(25.0 * physics.KN_TO_MS)
        assert angle == pytest.approx(0.0)

    def test_a_beam_wind_composes_as_the_hypotenuse(self):
        speed_ms, angle = physics.apparent_wind(true_wind_kn=12.0, wind_angle_deg=90.0, stw_kn=16.0)
        assert speed_ms == pytest.approx(math.hypot(12.0, 16.0) * physics.KN_TO_MS)
        # The apparent wind is drawn forward: it now blows from ahead of the beam.
        assert angle == pytest.approx(math.degrees(math.atan2(12.0, 16.0)))
        assert angle < 90.0


class TestWindResistance:
    """The sign flip is the contract: a head wind resists, a following wind thrusts."""

    AREA = 1300.0
    SPEED = 20.0

    def test_head_wind_resists(self):
        assert physics.wind_resistance_n(self.AREA, self.SPEED, 0.0) == pytest.approx(
            0.5 * physics.RHO_AIR_KG_M3 * physics.C_AA_HEAD * self.AREA * self.SPEED**2
        )

    def test_abeam_wind_adds_nothing(self):
        assert physics.wind_resistance_n(self.AREA, self.SPEED, 90.0) == pytest.approx(0.0, abs=1e-6)

    def test_following_wind_thrusts(self):
        following = physics.wind_resistance_n(self.AREA, self.SPEED, 180.0)
        assert following < 0.0
        assert following == pytest.approx(-physics.wind_resistance_n(self.AREA, self.SPEED, 0.0))


class TestWaveResistance:
    BREADTH = 51.0
    LPP = 352.0

    def _full(self, hs: float) -> float:
        """STAWAVE-1 with no taper: (1/16).rho.g.Hs^2.B.sqrt(B/L)."""
        return (
            (1.0 / 16.0)
            * physics.RHO_SW_KG_M3
            * physics.GRAVITY_M_S2
            * hs**2
            * self.BREADTH
            * math.sqrt(self.BREADTH / self.LPP)
        )

    @pytest.mark.parametrize('hs', [0.0, -1.0])
    def test_no_sea_no_resistance(self, hs):
        assert physics.wave_resistance_n(hs, self.BREADTH, self.LPP, 0.0) == 0.0

    @pytest.mark.parametrize('angle', [90.0, 135.0, 180.0])
    def test_following_seas_add_nothing(self, angle):
        assert physics.wave_resistance_n(3.0, self.BREADTH, self.LPP, angle) == 0.0

    @pytest.mark.parametrize('angle', [0.0, 30.0, 45.0])
    def test_full_effect_within_45_degrees_of_the_bow(self, angle):
        assert physics.wave_resistance_n(3.0, self.BREADTH, self.LPP, angle) == pytest.approx(self._full(3.0))

    def test_linear_taper_is_half_at_67_5_degrees(self):
        """67.5 deg is the midpoint of the 45->90 taper, so exactly half the head-sea value."""
        assert physics.wave_resistance_n(3.0, self.BREADTH, self.LPP, 67.5) == pytest.approx(0.5 * self._full(3.0))

    def test_scales_with_the_square_of_wave_height(self):
        one = physics.wave_resistance_n(1.0, self.BREADTH, self.LPP, 0.0)
        two = physics.wave_resistance_n(2.0, self.BREADTH, self.LPP, 0.0)
        assert two == pytest.approx(4.0 * one)


class TestClosedForms:
    def test_resistance_to_power_kw(self):
        power = physics.resistance_to_power_kw(500_000.0, 18.0)
        assert power == pytest.approx(500_000.0 * 18.0 * physics.KN_TO_MS / physics.PROPULSIVE_EFFICIENCY / 1000.0)

    def test_a_worse_propeller_needs_more_shaft_power(self):
        assert physics.resistance_to_power_kw(500_000.0, 18.0, eta=0.5) > physics.resistance_to_power_kw(
            500_000.0, 18.0, eta=0.7
        )

    def test_theoretical_speed_kn(self):
        assert physics.theoretical_speed_kn(9.8857, 76.0) == pytest.approx(9.8857 * 76.0 * 60.0 / 1852.0)

    def test_foc_mt(self):
        assert physics.foc_mt(25_000.0, 170.0, 24.0) == pytest.approx(25_000.0 * 170.0 * 24.0 / 1.0e6)

    def test_foc_and_sfoc_are_inverses(self):
        burn = physics.foc_mt(25_000.0, 170.0, 24.0)
        assert physics.sfoc_g_kwh(burn, 25_000.0, 24.0) == pytest.approx(170.0)


class TestSlip:
    def test_no_slip_at_the_theoretical_speed(self):
        v_th = physics.theoretical_speed_kn(9.8857, 76.0)
        assert physics.slip_fraction(v_th, 9.8857, 76.0) == pytest.approx(0.0)

    def test_a_slower_ship_slips_more(self):
        v_th = physics.theoretical_speed_kn(9.8857, 76.0)
        assert physics.slip_fraction(0.9 * v_th, 9.8857, 76.0) == pytest.approx(0.1)

    def test_a_stopped_propeller_has_no_slip_to_speak_of(self):
        assert physics.slip_fraction(18.0, 9.8857, 0.0) is None


class TestDegenerateDenominators:
    """Each of these divides by something the real data sometimes reports as zero."""

    def test_sfoc_needs_power_and_hours(self):
        assert physics.sfoc_g_kwh(100.0, 0.0, 24.0) is None
        assert physics.sfoc_g_kwh(100.0, 25_000.0, 0.0) is None

    def test_admiralty_closed_form(self):
        assert physics.admiralty_coef(166_500.0, 18.0, 25_000.0) == pytest.approx(
            166_500.0 ** (2.0 / 3.0) * 18.0**3 / 25_000.0
        )

    def test_admiralty_needs_power_and_displacement(self):
        assert physics.admiralty_coef(166_500.0, 18.0, 0.0) is None
        assert physics.admiralty_coef(0.0, 18.0, 25_000.0) is None

    def test_eeoi_closed_form(self):
        assert physics.eeoi(80.0, 100_000.0, 400.0) == pytest.approx(80.0 * 1.0e6 / (100_000.0 * 400.0))

    def test_eeoi_is_none_on_a_ballast_day(self):
        assert physics.eeoi(80.0, 0.0, 400.0) is None
        assert physics.eeoi(80.0, 100_000.0, 0.0) is None


class TestExcessFoc:
    CURVE_N = 3.5

    @pytest.mark.parametrize('speed_loss_pct', [0.0, -2.0, 100.0, 150.0])
    def test_no_excess_outside_a_real_speed_loss(self, speed_loss_pct):
        """A hull that is not losing speed wastes nothing, and 100 % loss is not a fuel figure."""
        assert physics.excess_foc_mt(80.0, speed_loss_pct, self.CURVE_N) == 0.0

    def test_rises_monotonically_with_speed_loss(self):
        excess = [physics.excess_foc_mt(80.0, s, self.CURVE_N) for s in (1.0, 2.0, 5.0, 10.0, 20.0)]
        assert all(a < b for a, b in zip(excess, excess[1:]))
        assert excess[0] > 0.0

    def test_closed_form(self):
        assert physics.excess_foc_mt(80.0, 10.0, self.CURVE_N) == pytest.approx(80.0 * (1.0 - 0.9**self.CURVE_N))


class TestDeepWaterFloor:
    """ISO 19030 takes the *stricter* of the two floors: h > 3.sqrt(B.T) and h > 2.75.V^2/g."""

    def test_is_the_max_of_the_two_iso_floors(self):
        breadth, draft, stw = 51.0, 14.5, 18.0
        draft_floor = 3.0 * math.sqrt(breadth * draft)
        speed_floor = 2.75 * (stw * physics.KN_TO_MS) ** 2 / physics.GRAVITY_M_S2
        assert physics.deep_water_min_m(breadth, draft, stw) == pytest.approx(max(draft_floor, speed_floor))

    def test_draft_term_dominates_a_beamy_hull_at_service_speed(self):
        assert physics.deep_water_min_m(51.0, 14.5, 18.0) == pytest.approx(3.0 * math.sqrt(51.0 * 14.5))

    def test_speed_term_dominates_a_slender_hull_running_hard(self):
        assert physics.deep_water_min_m(10.0, 5.0, 20.0) == pytest.approx(
            2.75 * (20.0 * physics.KN_TO_MS) ** 2 / physics.GRAVITY_M_S2
        )

    def test_the_floor_rises_with_speed(self):
        floors = [physics.deep_water_min_m(51.0, 14.5, v) for v in (5.0, 25.0, 35.0)]
        assert floors[0] <= floors[1] < floors[2]
