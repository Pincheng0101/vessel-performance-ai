"""``filters.is_valid`` — the 9-gate ISO 19030 validity predicate.

Every ISO number in the lake is computed only on the days this returns True for, so a gate
that silently stops gating is a silent corruption of the whole curated zone. Each test
starts from a day that passes, breaks exactly one field, and asserts the rejection — so a
failure names the gate that moved.

Thresholds are read from the module's own constants, never re-typed as literals: a test
that hardcodes ``4`` would keep passing if ``MAX_BEAUFORT`` were loosened to 8.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl import physics
from ym_datalake.etl.curated import filters


def _power_for(displacement: float, stw: float, admiralty: float) -> float:
    """The shaft power that puts this day's Admiralty coefficient at ``admiralty``.

    Used to move speed or displacement without tripping the *other* gate — otherwise a
    failing assertion would not say which one bit.
    """
    return displacement ** (2.0 / 3.0) * stw**3 / admiralty


MID_BAND = sum(filters.ADMIRALTY_BAND) / 2.0


class TestDocumentedThresholds:
    """The gate tests below are written against the constants, so they follow wherever a
    threshold moves — which is right for testing the *gate*, and useless for testing the
    *value*. This is the value: each number is quoted from the module docstring (and, for the
    first two, from the dataset README's own definition of a clean steady point). Move one
    and the docstring is a lie, so this fails on purpose."""

    def test_full_speed_hours(self):
        assert filters.MIN_FULL_SPEED_HOURS == 22.0

    def test_beaufort_ceiling(self):
        assert filters.MAX_BEAUFORT == 4.0

    def test_speed_floor_is_half_the_design_speed(self):
        assert filters.MIN_SPEED_FRACTION == 0.5

    def test_displacement_band(self):
        assert filters.DISP_BAND_FRACTION == (0.5, 1.2)

    def test_admiralty_band_is_wider_than_the_99_percent_spread_it_guards(self):
        """The fleet's valid days sit in 425-1100; the band is deliberately wider, so it
        rejects only the physically impossible, not the merely unusual."""
        assert filters.ADMIRALTY_BAND == (300.0, 1300.0)
        assert filters.ADMIRALTY_BAND[0] < 425.0 and filters.ADMIRALTY_BAND[1] > 1100.0


def test_the_happy_path_is_valid(noon_row, vessel):
    assert filters.is_valid(noon_row(), vessel) is True


def test_masked_rows_are_rejected(noon_row, vessel):
    """S21-S23's HIDDEN/PREDICT windows have no engine data to gate on."""
    assert filters.is_valid(noon_row(masked_flag=True), vessel) is False


@pytest.mark.parametrize('column', ['speed_through_water', 'horse_power', 'displacement'])
@pytest.mark.parametrize('value', [None, 0.0])
def test_the_propulsion_fields_must_exist_and_be_positive(noon_row, vessel, column, value):
    assert filters.is_valid(noon_row(**{column: value}), vessel) is False


def test_a_backfilled_displacement_cannot_underwrite_a_speed_loss(noon_row, vessel):
    """The module's headline rule: 4.95 pp of scatter on measured, 9.76 pp on backfilled."""
    assert filters.is_valid(noon_row(displacement_source='backfilled'), vessel) is False
    assert filters.is_valid(noon_row(displacement_source=None), vessel) is False


class TestAdmiraltyGate:
    """The invariant that catches the impossible speed/power *pair* (S4 day 131: 17.7 kn on
    2,103 kW). Both cells are individually in range; only their ratio gives them away."""

    def test_an_impossibly_low_power_is_rejected(self, noon_row, vessel):
        row = noon_row(speed_through_water=17.7, horse_power=2103.0)
        admiralty = physics.admiralty_coef(row['displacement'], row['speed_through_water'], row['horse_power'])
        assert admiralty is not None and admiralty > filters.ADMIRALTY_BAND[1]
        assert filters.is_valid(row, vessel) is False

    def test_an_implausibly_high_power_is_rejected(self, noon_row, vessel):
        power = _power_for(166500.0, 18.0, filters.ADMIRALTY_BAND[0] * 0.99)
        assert filters.is_valid(noon_row(horse_power=power), vessel) is False

    @pytest.mark.parametrize('edge', [0, 1])
    def test_the_band_is_inclusive_at_both_edges(self, noon_row, vessel, edge):
        power = _power_for(166500.0, 18.0, filters.ADMIRALTY_BAND[edge])
        assert filters.is_valid(noon_row(horse_power=power), vessel) is True


class TestSteadinessGate:
    def test_a_short_full_speed_day_is_rejected(self, noon_row, vessel):
        assert filters.is_valid(noon_row(hours_full_speed=filters.MIN_FULL_SPEED_HOURS - 0.1), vessel) is False

    def test_the_full_speed_floor_is_inclusive(self, noon_row, vessel):
        assert filters.is_valid(noon_row(hours_full_speed=filters.MIN_FULL_SPEED_HOURS), vessel) is True

    def test_a_missing_beaufort_is_not_a_pass(self, noon_row, vessel):
        """An ungated weather day cannot be called steady — null must not slip through."""
        assert filters.is_valid(noon_row(wind_scale=None), vessel) is False

    def test_heavy_weather_is_rejected(self, noon_row, vessel):
        assert filters.is_valid(noon_row(wind_scale=filters.MAX_BEAUFORT + 1.0), vessel) is False

    def test_the_beaufort_ceiling_is_inclusive(self, noon_row, vessel):
        assert filters.is_valid(noon_row(wind_scale=filters.MAX_BEAUFORT), vessel) is True


class TestCurveDomainGates:
    """Below half speed, or off the fitted displacement band, the reference curve is
    extrapolating and its speed loss means nothing."""

    def test_a_slow_day_is_rejected(self, noon_row, vessel):
        stw = filters.MIN_SPEED_FRACTION * vessel['design_speed_kn'] - 0.5
        row = noon_row(speed_through_water=stw, horse_power=_power_for(166500.0, stw, MID_BAND))
        assert filters.is_valid(row, vessel) is False

    def test_exactly_half_the_design_speed_still_passes(self, noon_row, vessel):
        stw = filters.MIN_SPEED_FRACTION * vessel['design_speed_kn']
        row = noon_row(speed_through_water=stw, horse_power=_power_for(166500.0, stw, MID_BAND))
        assert filters.is_valid(row, vessel) is True

    @pytest.mark.parametrize('fraction', [0.49, 1.21])
    def test_a_displacement_off_the_fitted_band_is_rejected(self, noon_row, vessel, fraction):
        displacement = fraction * vessel['displacement_design_t']
        row = noon_row(displacement=displacement, horse_power=_power_for(displacement, 18.0, MID_BAND))
        assert filters.is_valid(row, vessel) is False

    @pytest.mark.parametrize('fraction', list(filters.DISP_BAND_FRACTION))
    def test_the_displacement_band_is_inclusive(self, noon_row, vessel, fraction):
        displacement = fraction * vessel['displacement_design_t']
        row = noon_row(displacement=displacement, horse_power=_power_for(displacement, 18.0, MID_BAND))
        assert filters.is_valid(row, vessel) is True


class TestDeepWaterGate:
    """Shallow water inflates resistance and would masquerade as hull fouling."""

    def _floor(self, row: dict, vessel: dict) -> float:
        return physics.deep_water_min_m(vessel['breadth_m'], row['mean_draft_m'], row['speed_through_water'])

    def test_a_day_over_a_shoal_is_rejected(self, noon_row, vessel):
        row = noon_row()
        assert filters.is_valid(noon_row(water_depth=self._floor(row, vessel) - 1.0), vessel) is False

    def test_the_floor_itself_passes(self, noon_row, vessel):
        row = noon_row()
        assert filters.is_valid(noon_row(water_depth=self._floor(row, vessel)), vessel) is True

    def test_a_missing_depth_is_rejected(self, noon_row, vessel):
        assert filters.is_valid(noon_row(water_depth=None), vessel) is False

    def test_the_design_draft_stands_in_for_a_missing_mean_draft(self, noon_row, vessel):
        """No draft on the row is not a rejection — the gate falls back to the particular."""
        assert filters.is_valid(noon_row(mean_draft_m=None), vessel) is True
