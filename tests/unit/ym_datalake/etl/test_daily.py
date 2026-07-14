"""``curated.daily`` — the two null-semantics traps in the derived money columns.

Both bugs pinned here were invisible to a schema check (the column existed, the type was
right) and visible only in what the column *said*: a cost channel nulled by an input it does
not use, and a cumulative series that went null on its zero-increment days.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import daily
from ym_datalake.etl.raw.reference_curve import Curve

# P = 4.2867 . V^3 at S1's design displacement, so 25,000 kW <-> 18 kn on a clean hull.
CURVE = Curve(ref_curve_id='RC-S1', a=4.2867, n=3.0, displacement_ref_t=166_500.0)
PRICE_USD_PER_MT = 600.0
DAY = 100


@pytest.fixture
def build(vessel):
    """daily.build over one ship: the fuel priced (unless ``priced=False``), no geography."""

    def _build(*rows: dict, priced: bool = True) -> list[dict]:
        prices = {(row['noon_utc'], 'VLSFO'): PRICE_USD_PER_MT for row in rows} if priced else {}
        return daily.build(list(rows), {'S1': vessel}, [], {'S1': CURVE}, {}, prices)

    return _build


@pytest.fixture
def day(noon_row):
    """A cleaned + corrected day: burning VLSFO, in a seaway, with the ISO 15016 terms on it.

    ``power_corrected_kw`` is what ``corrections`` hands ``daily``, and it is what the speed
    loss is read off — 25,000 kW at 18 kn is exactly on CURVE, so the hull reads clean.
    """

    def _day(**overrides) -> dict:
        fields = {
            'noon_utc': DAY,
            'me_fullspeed_consump_vlsfo': 50.0,  # the fuel selector — this is what names the fuel
            'me_consumption': 80.0,
            'total_consump': 85.0,
            'sfoc': 180.0,
            'power_corrected_kw': 25_000.0,
            'resistance_wind_kn': 100.0,
            'resistance_wave_kn': 50.0,
        }
        return noon_row(**(fields | overrides))

    return _day


class TestCostAttribution:
    """The three channels are ADDITIVE, so they are INDEPENDENT: each is gated on its own
    inputs. One channel's missing input must not null the other two."""

    def test_a_day_with_no_me_consumption_still_reports_its_weather_cost(self, build, day):
        """The weather channel needs a resistance, an SFOC, a power and the hours — none of
        which is ``me_consumption``. 3,688 real rows had all four and reported NULL anyway."""
        (row,) = build(day(me_consumption=None))

        assert row['excess_cost_fouling_usd'] is None, 'no ME fuel — nothing to attribute to fouling'
        assert row['excess_cost_operational_usd'] is None, 'the load penalty is a share of ME fuel'
        assert row['excess_cost_weather_usd'] > 0.0, 'the ship still pushed through the weather'

    def test_a_complete_day_reports_all_three(self, build, day):
        (row,) = build(day())
        for column in ('excess_cost_fouling_usd', 'excess_cost_weather_usd', 'excess_cost_operational_usd'):
            assert row[column] is not None

    def test_an_unpriced_day_reports_no_usd_at_all(self, build, day):
        """A USD column with no price is not a zero — it is unknown."""
        (row,) = build(day(), priced=False)
        for column in ('excess_cost_fouling_usd', 'excess_cost_weather_usd', 'excess_cost_operational_usd'):
            assert row[column] is None


class TestCumulativeExcessCost:
    """A cumulative series must be non-decreasing across a cleaning cycle. A zero-excess day
    is an increment of $0, not a hole."""

    def test_a_clean_hull_day_holds_the_running_total_instead_of_nulling_it(self, build, day):
        fouled = day(noon_utc=DAY, speed_through_water=17.0)  # slower than the curve -> a loss
        clean = day(noon_utc=DAY + 1, speed_through_water=19.0)  # faster than it -> $0 excess

        first, second = build(fouled, clean)

        assert first['speed_loss_pct'] > 0.0
        assert first['cum_excess_cost_usd'] > 0.0
        assert second['speed_loss_pct'] < 0.0
        assert second['excess_cost_usd'] == 0.0, 'a hull faster than clean wastes no fuel'
        assert second['cum_excess_cost_usd'] == pytest.approx(first['cum_excess_cost_usd']), (
            'the cycle total must survive a day that added nothing to it'
        )

    def test_a_day_that_cannot_be_costed_reports_no_total(self, build, day):
        """Unknown increment -> unknown total. This is the null the column is *for*."""
        (row,) = build(day(me_consumption=None))
        assert row['excess_cost_usd'] is None
        assert row['cum_excess_cost_usd'] is None
