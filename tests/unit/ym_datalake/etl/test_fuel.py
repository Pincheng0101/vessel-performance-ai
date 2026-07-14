"""``etl.fuel`` — the 5 real fuels, and the synthesized price series.

The drift guard is the important one: ``FUEL_BY_COLUMN`` is a hand-written bridge between
the fuel catalogue and the ``noon_report`` schema, and nothing else would notice if a
column were renamed out from under it.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl import fuel
from ym_datalake.schema import NOON_REPORT_COLUMNS


class TestCatalogDrift:
    """Every fuel table must key on the same 5 fuels, and every column must exist."""

    def test_every_fuel_column_exists_in_the_noon_report_schema(self):
        columns = {name for name, _type in NOON_REPORT_COLUMNS}
        assert set(fuel.FUEL_BY_COLUMN) <= columns

    def test_the_fuel_tables_share_one_key_set(self):
        assert set(fuel.LCV_MJ_KG) == set(fuel.FUELS)
        assert set(fuel.CARBON_FACTOR) == set(fuel.FUELS)
        assert set(fuel.FUEL_BY_COLUMN.values()) == set(fuel.FUELS)
        assert len(fuel.FUELS) == 5


class TestPriceSeries:
    DAYS = list(range(400))

    def test_one_row_per_day_and_fuel(self):
        rows = fuel.build_price_series(self.DAYS)
        assert len(rows) == len(self.DAYS) * len(fuel.FUELS)
        assert len({(r['day'], r['fuel_type']) for r in rows}) == len(rows)

    def test_the_same_seed_gives_the_same_series(self):
        assert fuel.build_price_series(self.DAYS) == fuel.build_price_series(self.DAYS)

    def test_a_different_seed_gives_a_different_series(self):
        assert fuel.build_price_series(self.DAYS) != fuel.build_price_series(self.DAYS, seed=7)

    def test_prices_stay_inside_the_floor_and_ceiling(self):
        """A 5-year random walk is clamped to [0.5, 2.0] x its base, so no day prices bunker
        at 3 USD/t or 40,000."""
        for row in fuel.build_price_series(list(range(1826))):
            base = fuel._PRICE_BASE[row['fuel_type']]
            assert 0.5 * base <= row['price_usd_per_mt'] <= 2.0 * base

    def test_price_lookup_round_trips(self):
        rows = fuel.build_price_series(self.DAYS)
        lookup = fuel.price_lookup(rows)
        assert len(lookup) == len(rows)
        for row in rows:
            assert lookup[(row['day'], row['fuel_type'])] == row['price_usd_per_mt']


class TestDayFuelType:
    def test_the_dominant_burn_wins(self, noon_row):
        row = noon_row(me_fullspeed_consump_hshfo=10.0, me_fullspeed_consump_vlsfo=50.0)
        assert fuel.day_fuel_type(row) == 'VLSFO'

    def test_a_single_fuel_day(self, noon_row):
        assert fuel.day_fuel_type(noon_row(me_fullspeed_consump_lsmgo=42.0)) == 'LSMGO'

    def test_a_zero_burn_does_not_count_as_a_burn(self, noon_row):
        row = noon_row(me_fullspeed_consump_hshfo=0.0, me_fullspeed_consump_ulsfo=3.0)
        assert fuel.day_fuel_type(row) == 'ULSFO'

    def test_a_masked_day_falls_back_to_the_predict_marker(self, noon_row):
        """The PREDICT cells are null — the marker is the only surviving evidence."""
        row = noon_row(predict_fuel_type='ME_FULLSPEED_CONSUMP_HSHFO')
        assert fuel.day_fuel_type(row) == 'HSHFO'

    @pytest.mark.parametrize('marker', [None, ''])
    def test_no_burn_and_no_marker_is_none(self, noon_row, marker):
        assert fuel.day_fuel_type(noon_row(predict_fuel_type=marker)) is None
