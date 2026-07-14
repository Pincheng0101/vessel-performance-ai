"""``curated.cii`` — the annual A-E rating, broadcast back onto the daily grain.

The two things worth pinning: the D-D boundaries are *inclusive of the better grade*, and
the ``required`` line steps down every year — so the same attained carbon intensity is a
worse grade in 2026 than in 2023. That step is the whole reason the synthesized calendar
is load-bearing rather than cosmetic.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import cii

DWT = 150_000.0
_RATING_KEYS = {'cii_aer', 'cii_rating_aer', 'cii_imo', 'cii_rating_imo'}


def _reference() -> float:
    """The MEPC.353 container reference line at S1's capacity."""
    return cii._REF_A * DWT ** (-cii._REF_C)


def _daily(ship_id: str, year: int, co2_mt: float, distance: float) -> dict:
    return {'ship_id': ship_id, 'year': year, 'co2_mt': co2_mt, 'total_distance': distance}


def _co2_for(attained: float, distance: float) -> float:
    """The annual CO2 (t) that yields ``attained`` gCO2/dwt.nm over ``distance`` nm."""
    return attained * DWT * distance / 1.0e6


class TestRatingBoundaries:
    @pytest.mark.parametrize(('index', 'grade'), list(enumerate('ABCD')))
    def test_a_ratio_exactly_on_a_boundary_takes_the_better_grade(self, index, grade):
        """The comparisons are ``<=``: landing on d1 is an A, not a B."""
        assert cii._rating(cii._DD_VECTOR[index], 1.0) == grade

    @pytest.mark.parametrize(('index', 'grade'), list(enumerate('BCDE')))
    def test_a_hair_over_a_boundary_drops_a_grade(self, index, grade):
        assert cii._rating(cii._DD_VECTOR[index] + 1e-9, 1.0) == grade

    def test_a_very_efficient_ship_is_an_a(self):
        assert cii._rating(0.1, 1.0) == 'A'

    def test_a_very_dirty_ship_is_an_e(self):
        assert cii._rating(10.0, 1.0) == 'E'


class TestApply:
    def test_it_mutates_in_place_and_returns_nothing(self):
        rows = [_daily('S1', 2023, 50.0, 400.0)]
        assert cii.apply(rows, {'S1': {'dwt': DWT}}) is None
        assert _RATING_KEYS <= rows[0].keys()

    def test_the_annual_value_is_broadcast_onto_every_daily_row_of_that_year(self):
        rows = [_daily('S1', 2023, 50.0, 400.0), _daily('S1', 2023, 70.0, 600.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}})

        # One annual number, from the summed CO2 over the summed distance — not a daily one.
        expected = 120.0 * 1.0e6 / (DWT * 1000.0)
        assert rows[0]['cii_aer'] == pytest.approx(expected)
        assert rows[0]['cii_aer'] == rows[1]['cii_aer']
        assert rows[0]['cii_rating_aer'] == rows[1]['cii_rating_aer']

    def test_each_ship_year_is_rated_on_its_own(self):
        rows = [_daily('S1', 2023, 50.0, 400.0), _daily('S2', 2023, 500.0, 400.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}, 'S2': {'dwt': DWT}})
        assert rows[0]['cii_aer'] < rows[1]['cii_aer']

    def test_a_year_that_sailed_nowhere_gets_no_rating_at_all(self):
        """gCO2/dwt.nm over zero nm is not a large number, it is not a number."""
        rows = [_daily('S1', 2023, 50.0, 0.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}})
        assert not _RATING_KEYS & rows[0].keys()

    def test_the_required_line_steps_down_year_on_year(self):
        """The regulation tightens: 5 % below the 2019 line in 2023, 11 % in 2026."""
        assert [cii._Z_BY_YEAR[y] for y in (2023, 2024, 2025, 2026)] == [5.0, 7.0, 9.0, 11.0]

    def test_the_same_carbon_intensity_rates_worse_in_2026_than_against_the_base_line(self):
        """Attained == the base reference line: a C against that line (ratio 1.00), but a D
        against 2026's required line (ratio 1.12), which sits 11 % below it."""
        attained = _reference()
        rows = [_daily('S1', 2026, _co2_for(attained, 1000.0), 1000.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}})

        assert rows[0]['cii_aer'] == pytest.approx(attained)
        assert rows[0]['cii_rating_aer'] == 'C'
        assert rows[0]['cii_rating_imo'] == 'D'

    def test_the_same_carbon_intensity_still_rates_c_in_2023(self):
        """Same attained value, earlier year: 2023's line is only 5 % down, so it holds a C."""
        attained = _reference()
        rows = [_daily('S1', 2023, _co2_for(attained, 1000.0), 1000.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}})
        assert rows[0]['cii_rating_imo'] == 'C'

    def test_aer_and_imo_attained_coincide_for_a_container_ship(self):
        """Capacity = DWT, so the two attained values are the same number; only the line differs."""
        rows = [_daily('S1', 2024, 50.0, 400.0)]
        cii.apply(rows, {'S1': {'dwt': DWT}})
        assert rows[0]['cii_aer'] == rows[0]['cii_imo']
