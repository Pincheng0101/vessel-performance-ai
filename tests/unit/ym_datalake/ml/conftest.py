"""Shared factories for the M7 unit suite — tiny in-memory vessel histories."""

from __future__ import annotations

import datetime as dt

import pytest

from ym_datalake.ml.dataset import VesselSeries

START = dt.date(2024, 1, 1)


def make_series(
    n_days: int = 220,
    imo: str = '9700001',
    sl_start: float = 2.0,
    sl_slope: float = 0.05,
    reset_day: int | None = None,
    foc: float = 100.0,
    anomaly_days: tuple[int, ...] = (),
) -> VesselSeries:
    """A clean linear-fouling history; ``reset_day`` restarts the cycle clock."""
    dates, rows, noon = [], [], []
    cycle_start = 0
    cum_excess = 0.0
    for i in range(n_days):
        day = START + dt.timedelta(days=i)
        if reset_day is not None and i == reset_day:
            cycle_start = i
            cum_excess = 0.0
        age = i - cycle_start
        sl = sl_start + sl_slope * age
        sfoc, slip = 180.0, 0.10
        if i in anomaly_days:
            sl, sfoc, slip = sl + 6.0, sfoc + 30.0, slip + 0.08
        excess_foc = 90.0 * (1.0 - (1.0 - sl / 100.0) ** 3.0)
        excess_cost = excess_foc * 600.0
        cum_excess += excess_cost
        dates.append(day)
        rows.append(
            {
                'imo_number': imo,
                'report_date': day.isoformat(),
                'voyage_phase': 'at_sea',
                'condition_flag': 'laden',
                'valid_flag': True,
                'speed_loss_pct': sl,
                'slip_real': slip,
                'sfoc_g_kwh': sfoc,
                'admiralty_coef': 590.0,
                'days_since_cleaning': age,
                'days_since_dry_dock': i,
                'excess_foc_mt': excess_foc,
                'excess_cost_usd': excess_cost,
                'cum_excess_cost_usd': cum_excess,
            }
        )
        noon.append(
            {
                'imo_number': imo,
                'report_datetime_utc': f'{day.isoformat()} 12:00:00',
                'beaufort': 4,
                'wave_height_m': 1.5,
                'total_foc_mt': foc,
                'me_foc_mt': 90.0,
                'speed_tw_kn': 18.0,
            }
        )
    resets = [START + dt.timedelta(days=reset_day)] if reset_day is not None else []
    vessel = {'imo_number': imo, 'build_year': 2015, 'dwt': 90000.0, 'mcr_kw': 50000.0, 'design_speed_kn': 22.0}
    return VesselSeries(imo_number=imo, vessel=vessel, dates=dates, rows=rows, noon=noon, reset_dates=resets)


@pytest.fixture
def series():
    return make_series()
