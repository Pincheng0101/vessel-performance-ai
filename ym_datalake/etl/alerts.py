"""Early-warning alert layer (§5, Q3): promote point anomalies + the fouling trend
into deduplicated, narrated alert **episodes** (M3).

A promotion/narration layer over the existing point facts — it invents no new
detection. Two sources feed one episode-grained ``fact_alert`` table:

- **Point anomalies** — consecutive same-``cause`` ``fact_anomaly`` days are
  collapsed into an episode (gap tolerance ``_GAP_DAYS``): first/last-seen dates,
  peak severity/|z|, the driver metric at the peak, and the window's excess fuel
  cost. Foregrounds the fuel impact so a high-fuel driver reads as actionable.
- **Hull biofouling** — the one cause that is a *trend*, never a point anomaly.
  Sourced from the fouling cost model (``fact_recommendation``: a positive fouling
  rate + a trigger ETA) plus the trailing-14-day speed loss vs the maintenance
  trigger; severity tracks trigger proximity (the ``recommendation`` hull-clean
  logic). This is where biofouling finally becomes a classified, surfaced cause.

Each row carries a bilingual ``message_zh``/``message_en`` narrative, a recommended
action, ``status='open'`` and its ``source``. Grain mirrors ``fact_anomaly``
(imo-partitioned); the point-cause design of ``fact_anomaly`` is untouched.
"""

from __future__ import annotations

import datetime as dt

from ym_datalake.etl import periods
from ym_datalake.etl.recommendation import _HULL_CLEAN_SOON_DAYS
from ym_datalake.synthetic_data.fleet import VesselSpec

_GAP_DAYS = 7  # days of no flag before an episode of the same cause is considered new
_SEV_ORDER = {'low': 0, 'medium': 1, 'high': 2}

# Alert cause enum = the four point causes + biofouling (the trend-only cause).
_CAUSE_ZH = {
    'engine_degradation': '主機性能衰退',
    'propeller': '螺旋槳異常',
    'weather': '惡劣海氣象',
    'sensor': '感測器異常',
    'hull_biofouling': '船體生物附著',
}
_CAUSE_EN = {
    'engine_degradation': 'engine degradation',
    'propeller': 'propeller anomaly',
    'weather': 'heavy weather',
    'sensor': 'sensor fault',
    'hull_biofouling': 'hull biofouling',
}
_ACTION_ZH = {
    'engine_degradation': '安排主機檢查',
    'propeller': '安排螺旋槳檢查或拋光',
    'weather': '持續監控，與海氣象相關',
    'sensor': '檢查感測器校正',
    'hull_biofouling': '規劃船體清潔',
}
_ACTION_EN = {
    'engine_degradation': 'Schedule engine inspection',
    'propeller': 'Inspect / polish propeller',
    'weather': 'Monitor; weather-related',
    'sensor': 'Check sensor calibration',
    'hull_biofouling': 'Plan hull cleaning',
}


def _fmt_usd(value: float) -> str:
    return f'${value:,.0f}'


def _peak_severity(severities: list[str]) -> str:
    return max(severities, key=lambda s: _SEV_ORDER.get(s, 0))


def _cost_by_date(vessel_daily: list[dict]) -> dict[str, float]:
    return {r['report_date']: r['excess_cost_usd'] for r in vessel_daily if r.get('excess_cost_usd') is not None}


def _window_excess(cost_by_date: dict[str, float], opened: str, last_seen: str) -> float:
    # report_date is a YYYY-MM-DD string, so lexicographic comparison is chronological.
    return sum(c for d, c in cost_by_date.items() if opened <= d <= last_seen)


def _alert_row(
    imo: str,
    fleet_id: str,
    cause: str,
    *,
    opened: str,
    last_seen: str,
    severity: str,
    driver_metric: str,
    peak_value: float | None,
    peak_z: float | None,
    excess_cost_usd: float | None,
    source: str,
    message_zh: str,
    message_en: str,
) -> dict:
    """One ``fact_alert`` episode row (grain: vessel × alert episode)."""
    return {
        'imo_number': imo,
        'alert_id': f'AL-{imo}-{opened}-{cause}',
        'fleet_id': fleet_id,
        'opened_date': opened,
        'last_seen_date': last_seen,
        'cause': cause,
        'severity': severity,
        'driver_metric': driver_metric,
        'peak_value': peak_value,
        'peak_z': peak_z,
        'excess_cost_usd': excess_cost_usd,
        'recommended_action': f'{_ACTION_ZH[cause]} ({_ACTION_EN[cause]})',
        'status': 'open',
        'source': source,
        'message_zh': message_zh,
        'message_en': message_en,
    }


# --- Source 1: point-anomaly episodes ----------------------------------------


def _split_episodes(anoms: list[dict]) -> list[list[dict]]:
    """Split date-sorted same-cause anomalies at gaps > ``_GAP_DAYS``."""
    episodes: list[list[dict]] = []
    current: list[dict] = []
    prev: dt.date | None = None
    for a in anoms:
        d = periods.to_date(a['report_date'])
        if prev is not None and (d - prev).days > _GAP_DAYS:
            episodes.append(current)
            current = []
        current.append(a)
        prev = d
    if current:
        episodes.append(current)
    return episodes


def _point_episode_row(
    imo: str, fleet_id: str, cause: str, episode: list[dict], cost_by_date: dict[str, float]
) -> dict:
    opened = episode[0]['report_date']
    last_seen = episode[-1]['report_date']
    peak = max(episode, key=lambda a: abs(a['z_score']))
    severity = _peak_severity([a['severity'] for a in episode])
    excess = _window_excess(cost_by_date, opened, last_seen)
    n_days = len(episode)

    parts_zh = [f'{_CAUSE_ZH[cause]}：{n_days} 天異常（{opened}–{last_seen}）', f'峰值 z={peak["z_score"]:.1f}']
    parts_en = [
        f'{_CAUSE_EN[cause].capitalize()}: {n_days} anomaly-day{"s" if n_days != 1 else ""} ({opened}–{last_seen})',
        f'peak z={peak["z_score"]:.1f}',
    ]
    if excess:  # foreground the fuel impact (high-fuel drivers: sfoc / excess_foc)
        parts_zh.append(f'估計燃油損失 {_fmt_usd(excess)}')
        parts_en.append(f'est. excess fuel {_fmt_usd(excess)}')

    return _alert_row(
        imo,
        fleet_id,
        cause,
        opened=opened,
        last_seen=last_seen,
        severity=severity,
        driver_metric=peak['metric'],
        peak_value=peak['value'],
        peak_z=peak['z_score'],
        excess_cost_usd=excess,
        source='anomaly',
        message_zh='，'.join(parts_zh),
        message_en=', '.join(parts_en),
    )


def _point_alerts(imo: str, fleet_id: str, vessel_anomalies: list[dict], cost_by_date: dict[str, float]) -> list[dict]:
    by_cause: dict[str, list[dict]] = {}
    for a in vessel_anomalies:
        by_cause.setdefault(a['cause'], []).append(a)
    rows: list[dict] = []
    for cause, anoms in by_cause.items():
        for episode in _split_episodes(sorted(anoms, key=lambda a: a['report_date'])):
            rows.append(_point_episode_row(imo, fleet_id, cause, episode, cost_by_date))
    return rows


# --- Source 2: hull-biofouling trend alert -----------------------------------


def _trailing_speed_loss(vessel_daily: list[dict]) -> tuple[float | None, str | None]:
    """Trailing ``MT_WINDOW_DAYS`` mean of valid ``speed_loss_pct`` and its latest date."""
    valid = sorted(
        (r['report_date'], r['speed_loss_pct'])
        for r in vessel_daily
        if r.get('valid_flag') and r.get('speed_loss_pct') is not None
    )
    if not valid:
        return None, None
    window = [sl for _, sl in valid[-periods.MT_WINDOW_DAYS :]]
    return sum(window) / len(window), valid[-1][0]


def _cycle_excess(vessel_daily: list[dict]) -> float | None:
    """Latest ``cum_excess_cost_usd`` — the fouling penalty accrued this cleaning cycle."""
    priced = [r for r in vessel_daily if r.get('cum_excess_cost_usd') is not None]
    return max(priced, key=lambda r: r['report_date'])['cum_excess_cost_usd'] if priced else None


def _biofouling_alert(
    imo: str, fleet_id: str, rec: dict, vessel_daily: list[dict], latest_uwi: dict | None
) -> dict | None:
    rate = rec.get('fouling_rate_pct_per_day')
    if rate is None or rate <= 0.0:  # hull is not fouling — nothing to warn about
        return None
    trailing, last_seen = _trailing_speed_loss(vessel_daily)
    if last_seen is None:
        return None
    trigger_eta = rec.get('trigger_eta')
    over_trigger = trailing is not None and trailing >= periods.MT_TRIGGER_PCT
    if not (trigger_eta or over_trigger):  # no crossing forecast and not yet over — no alert
        return None

    latest = periods.to_date(last_seen)
    soon = over_trigger or (
        trigger_eta is not None and (periods.to_date(trigger_eta) - latest).days <= _HULL_CLEAN_SOON_DAYS
    )
    severity = 'high' if soon else 'medium'
    opened = rec.get('last_cleaning_date') or last_seen  # the current fouling cycle's start
    rating = latest_uwi['hull_fouling_rating'] if latest_uwi else None
    cum = _cycle_excess(vessel_daily)

    parts_zh = ['船體生物附著：速度損失趨勢上升']
    parts_en = ['Hull biofouling: speed loss trending up']
    if trailing is not None:
        parts_zh.append(f'近 14 日平均 {trailing:.1f}%（門檻 {periods.MT_TRIGGER_PCT:.0f}%）')
        parts_en.append(f'14-day mean {trailing:.1f}% (trigger {periods.MT_TRIGGER_PCT:.0f}%)')
    if trigger_eta:
        parts_zh.append(f'預估 {trigger_eta} 觸發')
        parts_en.append(f'est. trigger {trigger_eta}')
    if rating is not None:
        parts_zh.append(f'UWI 汙損等級 {rating}')
        parts_en.append(f'UWI fouling rating {rating}')
    if cum:
        parts_zh.append(f'本週期燃油損失 {_fmt_usd(cum)}')
        parts_en.append(f'cycle excess fuel {_fmt_usd(cum)}')

    return _alert_row(
        imo,
        fleet_id,
        'hull_biofouling',
        opened=opened,
        last_seen=last_seen,
        severity=severity,
        driver_metric='speed_loss',
        peak_value=trailing,
        peak_z=None,
        excess_cost_usd=cum,
        source='fouling_model',
        message_zh='，'.join(parts_zh),
        message_en=', '.join(parts_en),
    )


def build_alerts(
    vessel_daily: list[dict],
    vessel_anomalies: list[dict],
    rec: dict,
    vessel_uwi: list[dict],
    spec: VesselSpec,
    fleet_id: str,
) -> list[dict]:
    """Per-vessel open alert episodes: point-anomaly episodes + a biofouling trend alert.

    ``vessel_anomalies`` are this vessel's ``fact_anomaly`` rows; ``rec`` is its
    ``fact_recommendation`` (the fouling cost model). Returns rows sorted by
    ``(opened_date, cause)`` so the imo-partitioned output is deterministic.
    """
    imo = spec.imo_number
    cost_by_date = _cost_by_date(vessel_daily)
    latest_uwi = max(vessel_uwi, key=lambda u: u['inspection_date']) if vessel_uwi else None

    rows = _point_alerts(imo, fleet_id, vessel_anomalies, cost_by_date)
    biofouling = _biofouling_alert(imo, fleet_id, rec, vessel_daily, latest_uwi)
    if biofouling is not None:
        rows.append(biofouling)
    return sorted(rows, key=lambda r: (r['opened_date'], r['cause']))
