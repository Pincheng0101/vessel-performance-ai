"""``etl.epoch`` — the synthesized calendar draped over the relative-day axis.

ESTIMATED, and the tests say so: the only claim being pinned is that the mapping is the
one the module documents (day 0 = 2021-07-01, day 1825 = 2026-06-30 — five years, leap day
included), because the CII year and every ``report_date`` in the lake inherit it.
"""

from __future__ import annotations

import datetime as dt

import pytest

from ym_datalake.etl import epoch


def test_the_epoch_is_the_documented_one():
    assert epoch.EPOCH == dt.date(2021, 7, 1)


def test_day_zero_is_the_epoch():
    assert epoch.to_date(0) == epoch.EPOCH


def test_the_last_day_closes_an_exact_five_year_span():
    """Day 0-1825 is 2021-07-01 .. 2026-06-30 — 1,826 days, because 2024 is a leap year."""
    assert epoch.to_date(1825) == dt.date(2026, 6, 30)
    assert (epoch.to_date(1825) - epoch.EPOCH).days == 1825


@pytest.mark.parametrize(('day', 'iso'), [(0, '2021-07-01'), (184, '2022-01-01'), (1825, '2026-06-30')])
def test_to_date_str(day, iso):
    assert epoch.to_date_str(day) == iso


def test_to_date_str_passes_none_through():
    assert epoch.to_date_str(None) is None


@pytest.mark.parametrize(('day', 'year'), [(0, 2021), (183, 2021), (184, 2022), (1825, 2026)])
def test_year_of(day, year):
    """The CII reduction factor is keyed on this, so the year boundary has to land right."""
    assert epoch.year_of(day) == year


def test_calendar_carries_exactly_the_three_columns():
    assert epoch.calendar(0) == {'report_date': '2021-07-01', 'year': 2021, 'month': 7}
