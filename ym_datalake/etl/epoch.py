"""The synthesized calendar. ESTIMATED — the real data has no calendar at all.

``noon_utc`` is a *relative* day (day 0 = the ship's earliest record), shared by
``vt_fd`` and ``maintenance``. That relative axis is the real time axis and every
raw table keys off it.

A calendar exists only in the curated zone, and only because two things need one:

* the ``fuel_price`` join wants a date to print, and
* the CII ``required`` line is defined per calendar year (Z% steps 2023->5%,
  2024->7%, 2025->9%, 2026->11%), so without a year there is no rating.

Epoch: **day 0 = 2021-07-01**, shared by all 15 ships (the data spans day 0-1825,
i.e. 2021-07-01 .. 2026-06-30 — exactly 5 years). Ships did not in fact all start
on the same date; this is an assumption, and every ``report_date`` /
``*_date`` column in the lake inherits it.
"""

from __future__ import annotations

import datetime as dt

EPOCH = dt.date(2021, 7, 1)


def to_date(day: int) -> dt.date:
    """Relative day -> calendar date."""
    return EPOCH + dt.timedelta(days=int(day))


def to_date_str(day: int | None) -> str | None:
    """Relative day -> ``YYYY-MM-DD`` (temporals are stored as strings; see the SerDe note)."""
    return None if day is None else to_date(day).isoformat()


def year_of(day: int) -> int:
    """Calendar year of a relative day (the CII reduction factor is keyed on this)."""
    return to_date(day).year


def calendar(day: int) -> dict:
    """The three calendar columns every curated daily row carries."""
    date = to_date(day)
    return {'report_date': date.isoformat(), 'year': date.year, 'month': date.month}
