"""Bounded sensor noise and labeled anomaly injection (C12).

Measured fields = physical truth × bounded multiplicative noise. Every genuine
outlier is produced by a *labeled* injected anomaly (engine degradation, prop
slip jump, sensor outlier, extreme weather) so the validator can confirm that
un-labeled points stay within the noise bound and labeled points carry a cause.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from ym_datalake.synthetic_data.fleet import VesselSpec

# Relative sensor noise: small vs the early-cycle speed-loss range (~0.5 %) so
# C12/C13 stay recoverable.
SENSOR_REL_STD = 0.008
SENSOR_BOUND = 0.02  # hard clip on the relative error (2 %)


def sensor_multipliers(
    rng: np.random.Generator, n: int, rel_std: float = SENSOR_REL_STD, bound: float = SENSOR_BOUND
) -> np.ndarray:
    """Array of ``1 + clip(N(0, rel_std), ±bound)`` multipliers for one field."""
    return 1.0 + np.clip(rng.normal(0.0, rel_std, n), -bound, bound)


def _severity(magnitude: float, med: float, high: float) -> str:
    if magnitude >= high:
        return 'high'
    if magnitude >= med:
        return 'medium'
    return 'low'


def build_anomaly_plan(rng: np.random.Generator, spec: VesselSpec, dates: list[dt.date]) -> list[dict]:
    """Per-day anomaly annotations + injection parameters for one vessel."""
    n = len(dates)
    plan = [
        {
            'anomaly_flag': False,
            'anomaly_cause': None,
            'anomaly_severity': None,
            'sfoc_mult': 1.0,
            'slip_add': 0.0,
            'weather_scale': 1.0,
            'outlier_field': None,
            'outlier_mult': 1.0,
        }
        for _ in range(n)
    ]

    def stamp(i: int, cause: str, severity: str) -> None:
        # First cause wins for the label; injection params still stack.
        if not plan[i]['anomaly_flag']:
            plan[i]['anomaly_flag'] = True
            plan[i]['anomaly_cause'] = cause
            plan[i]['anomaly_severity'] = severity

    if n < 30:
        return plan

    # Engine degradation: one persistent SFOC step (raises FOC, not speed loss).
    dur = int(rng.integers(30, 120))
    s0 = int(rng.integers(0, max(1, n - dur)))
    mult = float(rng.uniform(1.08, 1.16))
    sev = _severity(mult - 1.0, 0.10, 0.13)
    for i in range(s0, min(n, s0 + dur)):
        plan[i]['sfoc_mult'] = mult
        stamp(i, 'engine_degradation', sev)

    # Propeller slip jump: temporary elevated slip (damage/fouling on the blade).
    dur = int(rng.integers(15, 45))
    s0 = int(rng.integers(0, max(1, n - dur)))
    add = float(rng.uniform(0.05, 0.12))
    sev = _severity(add, 0.07, 0.10)
    for i in range(s0, min(n, s0 + dur)):
        plan[i]['slip_add'] = add
        stamp(i, 'propeller', sev)

    # Extreme weather: a few isolated rough days (real, but flagged for M3).
    for i in rng.choice(n, size=int(rng.integers(3, 9)), replace=False):
        plan[int(i)]['weather_scale'] = float(rng.uniform(1.4, 1.9))
        stamp(int(i), 'weather', 'medium')

    # Sensor outliers: isolated single-field gross errors.
    fields = ['me_shaft_power_kw', 'me_foc_mt', 'speed_tw_kn', 'wind_speed_kn']
    for i in rng.choice(n, size=int(rng.integers(4, 12)), replace=False):
        plan[int(i)]['outlier_field'] = str(rng.choice(fields))
        plan[int(i)]['outlier_mult'] = float(rng.choice([rng.uniform(1.25, 1.6), rng.uniform(0.55, 0.78)]))
        stamp(int(i), 'sensor', 'high')

    return plan
