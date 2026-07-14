"""Curated ETL over the real dataset (vt_fd + maintenance).

Per ship: fit a clean-hull power curve P = a * V^n on baseline windows (first
days of data and after each fouling-reset event), invert it at the measured
power to get the expected speed, and derive ISO 19030-style speed loss. On top
of the daily table: robust-z anomalies, alert episodes, and maintenance
recommendations (the trigger/ETA logic). All thresholds are module constants —
POC heuristics, documented, not calibrated standards.

Output tables (JSONL, curated zone): fact_ship_daily (partitioned by ship_id),
fact_ship_anomaly, fact_ship_alert, fact_ship_maintenance_recommendation.
"""

from __future__ import annotations

import math
from collections import defaultdict
from pathlib import Path

from ym_datalake.synthetic_data.writer import _write_jsonl

# Steady-state gate (README: PREDICT days are >=22h full speed, wind <=4).
MIN_FULL_SPEED_HOURS = 20.0
MAX_WIND_SCALE = 4.0
STW_BOUNDS = (5.0, 30.0)

# Baseline (clean-hull) fit.
BASELINE_WINDOW_DAYS = 60
MIN_FIT_POINTS = 10
CURVE_N_BOUNDS = (2.0, 4.5)
# Maintenance types that reset the hull-fouling clock / start a clean window.
CLEANING_TYPES = {'UWC', 'UWC+PP', 'DD'}
POLISH_TYPES = {'PP', 'UWI+PP', 'UWC+PP', 'DD'}

# Anomaly detection: robust z over each ship's own distribution.
ANOMALY_METRICS = ('speed_loss_pct', 'sfoc', 'me_slip', 'total_consump')
Z_FLAG = 3.5
Z_MEDIUM = 4.5
Z_HIGH = 6.0
# Absolute scale floors so numerically-flat series don't flag noise.
_SCALE_FLOOR = {'speed_loss_pct': 0.5, 'sfoc': 2.0, 'me_slip': 0.5, 'total_consump': 1.0}

# Alert episodes.
ALERT_GAP_DAYS = 14
ALERT_OPEN_WINDOW_DAYS = 30

# Recommendations.
SPEED_LOSS_TRIGGER_PCT = 8.0
TRAILING_DAYS = 14
TREND_WINDOW_DAYS = 90
ETA_MEDIUM_DAYS = 60
ETA_LOW_DAYS = 180
SLIP_DRIFT_PP = 2.0
SFOC_DRIFT_RATIO = 1.05

_SEVERITY_RANK = {'low': 0, 'medium': 1, 'high': 2}


def fit_power_curve(rows: list[dict]) -> tuple[float, float] | None:
    """Least-squares fit of P = a * V^n in log-log space over gated rows.

    Returns (a, n) with n clamped to CURVE_N_BOUNDS, or None below MIN_FIT_POINTS.
    """
    points = [
        (r['speed_through_water'], r['horse_power'])
        for r in rows
        if _passes_gate(r) and r['speed_through_water'] and r['horse_power']
    ]
    if len(points) < MIN_FIT_POINTS:
        return None
    xs = [math.log(v) for v, _ in points]
    ys = [math.log(p) for _, p in points]
    n_pts = len(points)
    mean_x = sum(xs) / n_pts
    mean_y = sum(ys) / n_pts
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / var_x
    slope = min(max(slope, CURVE_N_BOUNDS[0]), CURVE_N_BOUNDS[1])
    a = math.exp(mean_y - slope * mean_x)
    return a, slope


def _passes_gate(r: dict) -> bool:
    stw, power = r.get('speed_through_water'), r.get('horse_power')
    return (
        not r.get('masked_flag')
        and power is not None
        and power > 0
        and stw is not None
        and STW_BOUNDS[0] <= stw <= STW_BOUNDS[1]
        and (r.get('hours_full_speed') or 0) >= MIN_FULL_SPEED_HOURS
        and (r.get('wind_scale') if r.get('wind_scale') is not None else MAX_WIND_SCALE) <= MAX_WIND_SCALE
    )


def days_since_events(days: list[int], events: list[dict], reset_types: set[str]) -> dict[int, int]:
    """Map each day to days since the latest reset event (first cycle anchored at the first day)."""
    if not days:
        return {}
    resets = sorted(e['event_day'] for e in events if e['event_type'] in reset_types)
    anchor = min(days)
    out: dict[int, int] = {}
    for day in days:
        last = anchor
        for reset in resets:
            if reset <= day:
                last = max(last, reset)
        out[day] = day - last
    return out


def _baseline_rows(rows: list[dict], events: list[dict]) -> list[dict]:
    """Rows inside a clean window: [start, start+BASELINE_WINDOW_DAYS] after data start or a cleaning event."""
    starts = [min(r['noon_utc'] for r in rows)]
    starts += [e['event_day'] for e in events if e['event_type'] in CLEANING_TYPES]
    return [r for r in rows if any(s <= r['noon_utc'] <= s + BASELINE_WINDOW_DAYS for s in starts)]


def build_daily(vt_fd_rows: list[dict], maintenance: list[dict]) -> list[dict]:
    """fact_ship_daily: per-ship gated daily rows + expected speed / speed loss / event clocks."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for r in vt_fd_rows:
        by_ship[r['ship_id']].append(r)
    events_by_ship: dict[str, list[dict]] = defaultdict(list)
    for e in maintenance:
        events_by_ship[e['ship_id']].append(e)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        events = events_by_ship.get(ship_id, [])
        fit = fit_power_curve(_baseline_rows(rows, events))
        days = [r['noon_utc'] for r in rows]
        since_clean = days_since_events(days, events, CLEANING_TYPES)
        since_polish = days_since_events(days, events, POLISH_TYPES)
        for r in rows:
            stw, power = r.get('speed_through_water'), r.get('horse_power')
            v_expected = speed_loss = None
            if fit and power and power > 0 and stw:
                a, n = fit
                v_expected = (power / a) ** (1.0 / n)
                speed_loss = (v_expected - stw) / v_expected * 100.0
            out.append(
                {
                    'ship_id': ship_id,
                    'noon_utc': r['noon_utc'],
                    'speed_through_water': stw,
                    'avg_speed': r.get('avg_speed'),
                    'me_avg_rpm': r.get('me_avg_rpm'),
                    'horse_power': power,
                    'sfoc': r.get('sfoc'),
                    'me_slip': r.get('me_slip'),
                    'total_consump': r.get('total_consump'),
                    'me_consumption': r.get('me_consumption'),
                    'hours_full_speed': r.get('hours_full_speed'),
                    'wind_scale': r.get('wind_scale'),
                    'v_expected_kn': v_expected,
                    'speed_loss_pct': speed_loss,
                    'days_since_cleaning': since_clean[r['noon_utc']],
                    'days_since_polish': since_polish[r['noon_utc']],
                    'valid_flag': _passes_gate(r),
                    'masked_flag': bool(r.get('masked_flag')),
                }
            )
    return out


def _robust_z(values: list[float], metric: str) -> tuple[float, float]:
    """(median, scale) for robust z-scores; scale floored so flat series stay quiet."""
    ordered = sorted(values)
    median = ordered[len(ordered) // 2]
    mad = sorted(abs(v - median) for v in values)[len(values) // 2]
    scale = 1.4826 * mad
    if scale == 0:
        mean = sum(values) / len(values)
        scale = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    return median, max(scale, _SCALE_FLOOR[metric])


def build_anomalies(daily: list[dict]) -> list[dict]:
    """fact_ship_anomaly: |robust z| >= Z_FLAG per ship per metric (valid rows only)."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for d in daily:
        if d['valid_flag']:
            by_ship[d['ship_id']].append(d)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        for metric in ANOMALY_METRICS:
            series = [(r['noon_utc'], r[metric]) for r in rows if r.get(metric) is not None]
            if len(series) < MIN_FIT_POINTS:
                continue
            median, scale = _robust_z([v for _, v in series], metric)
            for day, value in series:
                z = (value - median) / scale
                if abs(z) < Z_FLAG:
                    continue
                severity = 'high' if abs(z) >= Z_HIGH else 'medium' if abs(z) >= Z_MEDIUM else 'low'
                out.append(
                    {
                        'ship_id': ship_id,
                        'noon_utc': day,
                        'metric': metric,
                        'value': value,
                        'z_score': round(z, 2),
                        'severity': severity,
                    }
                )
    out.sort(key=lambda a: (a['ship_id'], a['noon_utc'], a['metric']))
    return out


def build_alerts(anomalies: list[dict], last_day_by_ship: dict[str, int]) -> list[dict]:
    """fact_ship_alert: (ship, metric) anomaly runs with gaps <= ALERT_GAP_DAYS become episodes."""
    by_key: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for a in anomalies:
        by_key[(a['ship_id'], a['metric'])].append(a)

    out: list[dict] = []
    for (ship_id, metric), hits in sorted(by_key.items()):
        hits.sort(key=lambda a: a['noon_utc'])
        episode: list[dict] = []
        for hit in hits:
            if episode and hit['noon_utc'] - episode[-1]['noon_utc'] > ALERT_GAP_DAYS:
                out.append(_episode_row(ship_id, metric, episode, last_day_by_ship))
                episode = []
            episode.append(hit)
        if episode:
            out.append(_episode_row(ship_id, metric, episode, last_day_by_ship))
    return out


def _episode_row(ship_id: str, metric: str, episode: list[dict], last_day_by_ship: dict[str, int]) -> dict:
    peak = max(episode, key=lambda a: abs(a['z_score']))
    severity = max((a['severity'] for a in episode), key=_SEVERITY_RANK.__getitem__)
    opened, last_seen = episode[0]['noon_utc'], episode[-1]['noon_utc']
    status = 'open' if last_seen >= last_day_by_ship.get(ship_id, last_seen) - ALERT_OPEN_WINDOW_DAYS else 'closed'
    return {
        'alert_id': f'AL-{ship_id}-{metric}-{opened}',
        'ship_id': ship_id,
        'metric': metric,
        'opened_day': opened,
        'last_seen_day': last_seen,
        'n_days': len(episode),
        'peak_value': peak['value'],
        'peak_z': peak['z_score'],
        'severity': severity,
        'status': status,
        'message': f'{metric} anomalous for {len(episode)} day(s) (peak z={peak["z_score"]})',
    }


def _slope(points: list[tuple[int, float]]) -> float:
    if len(points) < 2:
        return 0.0
    mean_x = sum(x for x, _ in points) / len(points)
    mean_y = sum(y for _, y in points) / len(points)
    var_x = sum((x - mean_x) ** 2 for x, _ in points)
    if var_x == 0:
        return 0.0
    return sum((x - mean_x) * (y - mean_y) for x, y in points) / var_x


def build_recommendations(daily: list[dict]) -> list[dict]:
    """fact_ship_maintenance_recommendation: trigger/ETA heuristics per ship.

    hull_cleaning: trailing speed loss vs SPEED_LOSS_TRIGGER_PCT (crossed -> high;
    else linear-trend ETA -> medium/low). propeller_polishing: trailing me_slip
    drift vs cycle median. engine_inspection: trailing SFOC vs early-history median.
    """
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for d in daily:
        if d['valid_flag']:
            by_ship[d['ship_id']].append(d)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        last_day = rows[-1]['noon_utc']

        loss_series = [(r['noon_utc'], r['speed_loss_pct']) for r in rows if r.get('speed_loss_pct') is not None]
        reco = _cleaning_reco(ship_id, loss_series, last_day)
        if reco:
            out.append(reco)

        slip_series = [(r['noon_utc'], r['me_slip']) for r in rows if r.get('me_slip') is not None]
        reco = _drift_reco(ship_id, slip_series, last_day, 'propeller_polishing', SLIP_DRIFT_PP, 'me_slip')
        if reco:
            out.append(reco)

        sfoc_series = [(r['noon_utc'], r['sfoc']) for r in rows if r.get('sfoc') is not None]
        if len(sfoc_series) >= MIN_FIT_POINTS:
            early = sorted(v for _, v in sfoc_series[: max(len(sfoc_series) // 3, MIN_FIT_POINTS)])
            baseline = early[len(early) // 2]
            trailing = _trailing_mean(sfoc_series, last_day)
            if trailing is not None and trailing >= baseline * SFOC_DRIFT_RATIO:
                out.append(
                    {
                        'ship_id': ship_id,
                        'action_type': 'engine_inspection',
                        'priority': 'medium',
                        'due_day': last_day,
                        'current_value': round(trailing, 2),
                        'threshold_value': round(baseline * SFOC_DRIFT_RATIO, 2),
                        'rate_per_day': None,
                        'trigger_eta_day': last_day,
                        'rationale': f'trailing SFOC {trailing:.1f} g/kWh >= {SFOC_DRIFT_RATIO:.0%} of early baseline',
                    }
                )
    return out


def _trailing_mean(series: list[tuple[int, float]], last_day: int) -> float | None:
    window = [v for d, v in series if d > last_day - TRAILING_DAYS]
    return sum(window) / len(window) if window else None


def _cleaning_reco(ship_id: str, series: list[tuple[int, float]], last_day: int) -> dict | None:
    if len(series) < MIN_FIT_POINTS:
        return None
    trailing = _trailing_mean(series, last_day)
    if trailing is None:
        return None
    rate = _slope([(d, v) for d, v in series if d > last_day - TREND_WINDOW_DAYS])
    base = {
        'ship_id': ship_id,
        'action_type': 'hull_cleaning',
        'current_value': round(trailing, 2),
        'threshold_value': SPEED_LOSS_TRIGGER_PCT,
        'rate_per_day': round(rate, 4),
    }
    if trailing >= SPEED_LOSS_TRIGGER_PCT:
        return base | {
            'priority': 'high',
            'due_day': last_day,
            'trigger_eta_day': last_day,
            'rationale': 'trailing speed loss over trigger',
        }
    if rate <= 0:
        return None
    eta = (SPEED_LOSS_TRIGGER_PCT - trailing) / rate
    if eta > ETA_LOW_DAYS:
        return None
    due = last_day + round(eta)
    priority = 'medium' if eta <= ETA_MEDIUM_DAYS else 'low'
    return base | {
        'priority': priority,
        'due_day': due,
        'trigger_eta_day': due,
        'rationale': f'speed loss trend crosses trigger in ~{round(eta)} days',
    }


def _drift_reco(
    ship_id: str, series: list[tuple[int, float]], last_day: int, action: str, drift: float, label: str
) -> dict | None:
    if len(series) < MIN_FIT_POINTS:
        return None
    trailing = _trailing_mean(series, last_day)
    values = sorted(v for _, v in series)
    median = values[len(values) // 2]
    if trailing is None or trailing - median < drift:
        return None
    return {
        'ship_id': ship_id,
        'action_type': action,
        'priority': 'medium',
        'due_day': last_day,
        'current_value': round(trailing, 2),
        'threshold_value': round(median + drift, 2),
        'rate_per_day': None,
        'trigger_eta_day': last_day,
        'rationale': f'trailing {label} {trailing:.1f} drifted >= {drift} above cycle median {median:.1f}',
    }


def compute_all(vt_fd_rows: list[dict], maintenance: list[dict]) -> dict[str, list[dict]]:
    """Run the full pipeline; returns {table_name: rows}."""
    daily = build_daily(vt_fd_rows, maintenance)
    anomalies = build_anomalies(daily)
    last_day_by_ship: dict[str, int] = {}
    for d in daily:
        last_day_by_ship[d['ship_id']] = max(last_day_by_ship.get(d['ship_id'], 0), d['noon_utc'])
    return {
        'fact_ship_daily': daily,
        'fact_ship_anomaly': anomalies,
        'fact_ship_alert': build_alerts(anomalies, last_day_by_ship),
        'fact_ship_maintenance_recommendation': build_recommendations(daily),
    }


def write_curated(tables: dict[str, list[dict]], out_dir: str | Path) -> dict[str, int]:
    """Write the curated tables under ``out_dir/curated`` (fact_ship_daily Hive-partitioned by ship_id)."""
    curated = Path(out_dir) / 'curated'
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in tables['fact_ship_daily']:
        groups[row['ship_id']].append(row)
    for ship_id, group in sorted(groups.items()):
        _write_jsonl(curated / 'fact_ship_daily' / f'ship_id={ship_id}' / 'data.jsonl', group)
    for name in ('fact_ship_anomaly', 'fact_ship_alert', 'fact_ship_maintenance_recommendation'):
        _write_jsonl(curated / name / f'{name}.jsonl', tables[name])
    return {name: len(rows) for name, rows in tables.items()}
