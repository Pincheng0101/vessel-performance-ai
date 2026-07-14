"""Seasonal met-ocean generation (C11).

Draws a correlated daily series: Beaufort drives wind speed and significant wave
height (so ``corr(beaufort, wind)`` and ``corr(beaufort, wave_height)`` are
strongly positive); seawater density falls with temperature (strong negative
correlation). Directions are loosely coupled (wind ≈ wave heading).

A whole vessel's series is drawn at once from one ``environment`` substream so
the run stays deterministic and order-independent.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from ym_datalake.synthetic_data.physics import KN_TO_MS

# Beaufort → 10-minute mean wind speed (m/s): v = 0.836 · B^1.5 (WMO).
_BEAUFORT_WIND_COEF = 0.836


def _day_of_year(date: dt.date) -> int:
    return date.timetuple().tm_yday


def generate_environment(rng: np.random.Generator, dates: list[dt.date]) -> list[dict]:
    """Return one met-ocean dict per date in ``dates``."""
    n = len(dates)
    doy = np.array([_day_of_year(d) for d in dates], dtype=float)

    # Seasonal roughness: peaks in boreal winter (~day 15), calm mid-year.
    season_rough = np.cos(2.0 * np.pi * (doy - 15.0) / 365.25)
    # Seasonal temperature: warm mid-year (peaks ~day 200 for N. hemisphere).
    season_temp = np.cos(2.0 * np.pi * (doy - 200.0) / 365.25)

    # Beaufort: seasonal mean + AR-ish noise, occasional storm spikes.
    mean_bf = 3.4 + 1.4 * season_rough
    beaufort = mean_bf + rng.normal(0.0, 0.9, n)
    beaufort = np.clip(np.rint(beaufort), 0, 12).astype(int)

    # Wind speed from Beaufort (dominant) + small measurement scatter.
    wind_ms = _BEAUFORT_WIND_COEF * np.power(np.maximum(beaufort, 0.1), 1.5)
    wind_speed_kn = wind_ms / KN_TO_MS + rng.normal(0.0, 1.0, n)
    wind_speed_kn = np.clip(wind_speed_kn, 0.0, None)

    # Significant wave height from Beaufort (dominant) + small scatter.
    wave_height_m = 0.20 * np.power(np.maximum(beaufort, 0.1), 1.4) + rng.normal(0.0, 0.15, n)
    wave_height_m = np.clip(wave_height_m, 0.1, None)
    wave_period_s = 3.5 * np.sqrt(wave_height_m + 0.5) + rng.normal(0.0, 0.3, n)
    wave_period_s = np.clip(wave_period_s, 2.0, None)

    swell_height_m = np.clip(0.5 * wave_height_m + rng.normal(0.0, 0.2, n), 0.0, None)

    # Directions: wind sets the weather heading; waves follow closely; swell/current freer.
    wind_dir_deg = rng.uniform(0.0, 360.0, n)
    wave_dir_deg = (wind_dir_deg + rng.normal(0.0, 15.0, n)) % 360.0
    swell_dir_deg = rng.uniform(0.0, 360.0, n)
    current_dir_deg = rng.uniform(0.0, 360.0, n)

    current_speed_kn = np.clip(rng.gamma(2.0, 0.3, n), 0.0, 2.5)

    # Temperatures: seasonal, sea lags air slightly.
    sea_water_temp_c = 18.0 + 8.0 * season_temp + rng.normal(0.0, 1.2, n)
    air_temp_c = sea_water_temp_c + rng.normal(1.0, 1.5, n)

    # Pressure: lower in rough weather (storms).
    air_pressure_hpa = 1013.0 - 1.8 * (beaufort - 3.0) + rng.normal(0.0, 4.0, n)

    # Seawater density falls with temperature (strong negative correlation, C11).
    sea_water_density_kg_m3 = 1027.0 - 0.25 * (sea_water_temp_c - 10.0) + rng.normal(0.0, 0.15, n)

    records: list[dict] = []
    for i in range(n):
        records.append(
            {
                'beaufort': int(beaufort[i]),
                'wind_speed_kn': float(wind_speed_kn[i]),
                'wind_dir_deg': float(wind_dir_deg[i]),
                'wave_height_m': float(wave_height_m[i]),
                'wave_dir_deg': float(wave_dir_deg[i]),
                'wave_period_s': float(wave_period_s[i]),
                'swell_height_m': float(swell_height_m[i]),
                'swell_dir_deg': float(swell_dir_deg[i]),
                'sea_water_temp_c': float(sea_water_temp_c[i]),
                'air_temp_c': float(air_temp_c[i]),
                'air_pressure_hpa': float(air_pressure_hpa[i]),
                'current_speed_kn': float(current_speed_kn[i]),
                'current_dir_deg': float(current_dir_deg[i]),
                'sea_water_density_kg_m3': float(sea_water_density_kg_m3[i]),
            }
        )
    return records
