"""``fact_alert`` — the narration layer over the point facts. It runs no new detection.

Two sources feed it:

* **anomaly episodes** — consecutive same-cause ``fact_anomaly`` days collapsed with a
  7-day gap tolerance, so one bad week is one alert and not seven.
* **the biofouling trend** — from ``fact_recommendation``'s fouling rate and trigger ETA.

Biofouling is a cause *here* even though it is deliberately never a ``fact_anomaly`` point
cause: it is a slope, not a spike, and this is the layer where slopes get to speak.

Messages are bilingual (中文 / English) because the dashboard is.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import epoch
from ym_datalake.etl.curated.daily import FLEET_BY_HULL_CLASS
from ym_datalake.etl.curated.indicators import MT_TRIGGER_PCT

EPISODE_GAP_DAYS = 7
TRAILING_DAYS = 14
_SEVERITY_RANK = {'low': 0, 'medium': 1, 'high': 2}

_ACTION_ZH = {
    'hull_biofouling': '規劃船體清潔 (Plan hull cleaning)',
    'propeller': '安排螺旋槳拋光 (Schedule propeller polishing)',
    'engine_degradation': '安排主機檢查 (Schedule engine inspection)',
    'weather': '持續監控，與海氣象相關 (Monitor; weather-related)',
    'sensor': '檢查感測器校正 (Check sensor calibration)',
}
_CAUSE_ZH = {
    'hull_biofouling': '船體生物附著',
    'propeller': '螺旋槳劣化',
    'engine_degradation': '主機效能衰退',
    'weather': '惡劣海氣象',
    'sensor': '感測器異常',
}
_CAUSE_EN = {
    'hull_biofouling': 'Hull biofouling',
    'propeller': 'Propeller degradation',
    'engine_degradation': 'Engine degradation',
    'weather': 'Heavy weather',
    'sensor': 'Sensor fault',
}


def build(
    anomalies: list[dict],
    daily_rows: list[dict],
    recommendations: list[dict],
    vessels: dict[str, dict],
) -> list[dict]:
    """Alert episodes from the anomaly stream, plus one biofouling alert per fouling ship."""
    daily_by_key = {(r['ship_id'], r['noon_utc']): r for r in daily_rows}
    last_day_by_ship: dict[str, int] = {}
    for row in daily_rows:
        ship = row['ship_id']
        if ship not in last_day_by_ship or row['noon_utc'] > last_day_by_ship[ship]:
            last_day_by_ship[ship] = row['noon_utc']

    out: list[dict] = []

    episodes: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for anomaly in anomalies:
        episodes[(anomaly['ship_id'], anomaly['cause'])].append(anomaly)

    for (ship_id, cause), hits in sorted(episodes.items()):
        hits.sort(key=lambda a: a['noon_utc'])
        run: list[dict] = []
        for hit in hits:
            if run and hit['noon_utc'] - run[-1]['noon_utc'] > EPISODE_GAP_DAYS:
                out.append(_episode(ship_id, cause, run, daily_by_key, vessels, last_day_by_ship))
                run = []
            run.append(hit)
        if run:
            out.append(_episode(ship_id, cause, run, daily_by_key, vessels, last_day_by_ship))

    for reco in recommendations:
        alert = _biofouling(reco, daily_rows, vessels, last_day_by_ship)
        if alert:
            out.append(alert)

    out.sort(key=lambda a: (a['ship_id'], a['opened_day'], a['cause']))
    return out


def _episode(
    ship_id: str,
    cause: str,
    run: list[dict],
    daily_by_key: dict,
    vessels: dict[str, dict],
    last_day_by_ship: dict[str, int],
) -> dict:
    peak = max(run, key=lambda a: abs(a['z_score']))
    severity = max((a['severity'] for a in run), key=_SEVERITY_RANK.__getitem__)
    opened, last_seen = run[0]['noon_utc'], run[-1]['noon_utc']

    excess = 0.0
    for day in range(opened, last_seen + 1):
        row = daily_by_key.get((ship_id, day))
        if row and row.get('excess_cost_usd'):
            excess += row['excess_cost_usd']

    # An episode is open if it is still recent; otherwise the ship sailed out of it.
    status = 'open' if last_seen >= last_day_by_ship[ship_id] - 30 else 'closed'
    span = f'{epoch.to_date_str(opened)}–{epoch.to_date_str(last_seen)}'
    return {
        'ship_id': ship_id,
        'alert_id': f'AL-{ship_id}-{opened}-{cause}',
        'fleet_id': FLEET_BY_HULL_CLASS[vessels[ship_id]['hull_class']],
        'opened_day': opened,
        'last_seen_day': last_seen,
        'opened_date': epoch.to_date_str(opened),
        'last_seen_date': epoch.to_date_str(last_seen),
        'cause': cause,
        'severity': severity,
        'driver_metric': peak['metric'],
        'peak_value': peak['value'],
        'peak_z': peak['z_score'],
        'excess_cost_usd': excess,
        'recommended_action': _ACTION_ZH[cause],
        'status': status,
        'source': 'anomaly',
        'message_zh': (
            f'{_CAUSE_ZH[cause]}：{len(run)} 天異常（{span}），峰值 z={peak["z_score"]:.1f}，'
            f'估計燃油損失 ${excess:,.0f}'
        ),
        'message_en': (
            f'{_CAUSE_EN[cause]}: {len(run)} anomaly-day(s) ({span}), peak z={peak["z_score"]:.1f}, '
            f'est. excess fuel ${excess:,.0f}'
        ),
    }


def _biofouling(
    reco: dict, daily_rows: list[dict], vessels: dict[str, dict], last_day_by_ship: dict[str, int]
) -> dict | None:
    """One open alert per ship whose hull is measurably fouling. A trend, so no z-score."""
    ship_id = reco['ship_id']
    if reco['status'] != 'ok' or not reco['fouling_rate_pct_per_day'] or reco['fouling_rate_pct_per_day'] <= 0:
        return None

    last_day = last_day_by_ship[ship_id]
    opened = reco['last_cleaning_day']
    cycle = [r for r in daily_rows if r['ship_id'] == ship_id and r['noon_utc'] >= opened and r['valid_flag']]
    trailing = [
        r['speed_loss_pct']
        for r in cycle
        if r['noon_utc'] > last_day - TRAILING_DAYS and r.get('speed_loss_pct') is not None
    ]
    if not trailing:
        return None
    peak = sum(trailing) / len(trailing)
    excess = sum(r['excess_cost_usd'] for r in cycle if r.get('excess_cost_usd'))

    severity = 'high' if peak >= MT_TRIGGER_PCT else 'medium' if peak >= MT_TRIGGER_PCT * 0.6 else 'low'
    eta = reco['trigger_eta_day']
    eta_zh = f'預估 {epoch.to_date_str(eta)} 觸發，' if eta else ''
    eta_en = f'est. trigger {epoch.to_date_str(eta)}, ' if eta else ''
    return {
        'ship_id': ship_id,
        'alert_id': f'AL-{ship_id}-{opened}-hull_biofouling',
        'fleet_id': FLEET_BY_HULL_CLASS[vessels[ship_id]['hull_class']],
        'opened_day': opened,
        'last_seen_day': last_day,
        'opened_date': epoch.to_date_str(opened),
        'last_seen_date': epoch.to_date_str(last_day),
        'cause': 'hull_biofouling',
        'severity': severity,
        'driver_metric': 'speed_loss',
        'peak_value': peak,
        'peak_z': None,  # a trend has no z-score, and inventing one would be a lie
        'excess_cost_usd': excess,
        'recommended_action': _ACTION_ZH['hull_biofouling'],
        'status': 'open',
        'source': 'fouling_model',
        'message_zh': (
            f'船體生物附著：速度損失趨勢上升，近 {TRAILING_DAYS} 日平均 {peak:.1f}%'
            f'（門檻 {MT_TRIGGER_PCT:.0f}%），{eta_zh}本週期燃油損失 ${excess:,.0f}'
        ),
        'message_en': (
            f'Hull biofouling: speed loss trending up, {TRAILING_DAYS}-day mean {peak:.1f}% '
            f'(trigger {MT_TRIGGER_PCT:.0f}%), {eta_en}cycle excess fuel ${excess:,.0f}'
        ),
    }
