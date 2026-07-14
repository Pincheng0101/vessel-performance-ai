"""``fact_anomaly`` — point anomalies over the daily facts, with a rule-based cause.

Four channels are watched: ``speed_loss``, ``slip``, ``sfoc`` and ``excess_foc``. Each is
scored as a **robust z** (median / MAD) against the ship's own distribution, so a ship
that simply runs hot does not flag every day. A day flags at the **driver metric** — the
channel with the largest |z| — and gets one row.

> **Biofouling is a trend slope, never a point-anomaly cause.** The cause set is
> ``{engine_degradation, propeller, weather, sensor}``. Gradual hull fouling shows up as
> the *slope* of speed loss through a cleaning cycle, and it surfaces in ``fact_alert``
> and ``fact_recommendation`` — not here. A hull that fouls over six months does not
> produce an outlier on any single day, and flagging one would be a false positive with a
> plausible story attached.
"""

from __future__ import annotations

import math
from collections import defaultdict

from ym_datalake.etl import epoch

METRICS = ('speed_loss', 'slip', 'sfoc', 'excess_foc')
_COLUMN = {
    'speed_loss': 'speed_loss_pct',
    'slip': 'slip_real',
    'sfoc': 'sfoc_g_kwh',
    'excess_foc': 'excess_foc_mt',
}

Z_FLAG = 3.5
Z_MEDIUM = 4.5
Z_HIGH = 6.0
MIN_POINTS = 20

# Absolute scale floors, so a numerically flat series does not turn sensor noise into a
# 10-sigma event just because its MAD is tiny.
_SCALE_FLOOR = {'speed_loss': 0.5, 'slip': 0.01, 'sfoc': 2.0, 'excess_foc': 0.5}

# Cause rules. Weather is checked first: a rough day explains itself.
_HEAVY_WEATHER_BEAUFORT = 5.0
_SENSOR_Z = 8.0  # beyond this, no hull or engine did it — the instrument did


def _robust_scale(values: list[float], metric: str) -> tuple[float, float]:
    ordered = sorted(values)
    median = ordered[len(ordered) // 2]
    mad = sorted(abs(v - median) for v in values)[len(values) // 2]
    scale = 1.4826 * mad
    if scale == 0.0:
        mean = sum(values) / len(values)
        scale = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    return median, max(scale, _SCALE_FLOOR[metric])


def _cause(metric: str, z: float, row: dict) -> str:
    if abs(z) >= _SENSOR_Z:
        return 'sensor'
    if (row.get('wind_scale') or 0.0) >= _HEAVY_WEATHER_BEAUFORT:
        return 'weather'
    if metric == 'sfoc':
        return 'engine_degradation'
    if metric == 'slip':
        return 'propeller'
    return 'engine_degradation' if metric == 'excess_foc' else 'propeller'


def build(daily_rows: list[dict]) -> list[dict]:
    """One row per flagged (ship, day), at the driver metric. Valid points only."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in daily_rows:
        if row['valid_flag']:
            by_ship[row['ship_id']].append(row)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        # Score every channel first, then let the strongest one claim the day.
        scored: dict[int, list[tuple[float, str, float]]] = defaultdict(list)
        for metric in METRICS:
            column = _COLUMN[metric]
            series = [(r['noon_utc'], r[column]) for r in rows if r.get(column) is not None]
            if len(series) < MIN_POINTS:
                continue
            median, scale = _robust_scale([v for _, v in series], metric)
            for day, value in series:
                z = (value - median) / scale
                if abs(z) >= Z_FLAG:
                    scored[day].append((abs(z), metric, value))

        by_day = {r['noon_utc']: r for r in rows}
        for day, hits in sorted(scored.items()):
            abs_z, metric, value = max(hits)
            row = by_day[day]
            severity = 'high' if abs_z >= Z_HIGH else 'medium' if abs_z >= Z_MEDIUM else 'low'
            out.append(
                {
                    'ship_id': ship_id,
                    'noon_utc': day,
                    'report_date': epoch.to_date_str(day),
                    'metric': metric,
                    'value': value,
                    'z_score': abs_z,
                    'severity': severity,
                    'cause': _cause(metric, abs_z, row),
                }
            )
    return out


def apply_to_daily(daily_rows: list[dict], anomalies: list[dict]) -> None:
    """Fill the daily table's ``anomaly_*`` stub columns, in place."""
    flagged = {(a['ship_id'], a['noon_utc']): a for a in anomalies}
    for row in daily_rows:
        anomaly = flagged.get((row['ship_id'], row['noon_utc']))
        if anomaly:
            row['anomaly_flag'] = True
            row['anomaly_cause'] = anomaly['cause']
            row['anomaly_severity'] = anomaly['severity']
