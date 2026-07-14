"""Curated-compute checks for the split dry-dock / in-water day clocks."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate

# YM WELLNESS has a known schedule (fouling.py:_wellness_schedule): dry_dock at
# start+315, hull_cleaning at start+700 and start+1294.
_START = dt.date(2021, 7, 1)
_DRY_DOCK = _START + dt.timedelta(days=315)


@pytest.fixture
def wellness_daily(monkeypatch):
    """fact_performance_daily rows for WELLNESS over its engineered arc."""
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO)])
    curated = compute_curated(generate(_START, dt.date(2024, 6, 30), seed=7))
    rows = [r for r in curated.fact_performance_daily if r['imo_number'] == WELLNESS_IMO]
    return sorted(rows, key=lambda r: r['report_date'])


def test_new_day_clocks_present_and_int(wellness_daily):
    assert wellness_daily
    for r in wellness_daily:
        assert isinstance(r['days_since_dry_dock'], int)
        assert isinstance(r['days_since_in_water'], int)


def test_union_clock_is_min_of_split_clocks(wellness_daily):
    # days_since_cleaning is the union clock; it must equal the earlier of the two.
    for r in wellness_daily:
        assert r['days_since_cleaning'] == min(r['days_since_dry_dock'], r['days_since_in_water'])


def test_dry_dock_resets_its_own_clock(wellness_daily):
    # The first report on/after the dry_dock sits near the reset (in-water clock,
    # anchored at window start with no cleaning yet, is far larger).
    after = next(r for r in wellness_daily if r['report_date'] >= _DRY_DOCK.isoformat())
    assert after['days_since_dry_dock'] < 10
    assert after['days_since_in_water'] > after['days_since_dry_dock']
