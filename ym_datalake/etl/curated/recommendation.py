"""``fact_recommendation`` + ``fact_maintenance_recommendation`` — when to service, and why.

**The hull-cleaning optimum, in closed form.** Fouling makes fuel cost rise roughly
linearly through a cycle, ``c(t) = alpha + beta.t``. Cleaning costs a fixed ``K`` and
resets ``t`` to 0. The average cost rate over a cycle of length ``T`` is therefore::

    J(T) = K/T + alpha + beta.T/2

which is convex in ``T``, and ``dJ/dT = 0`` gives the optimal interval::

    T* = sqrt(2K / beta)

Clean sooner and you pay for the cleanings; clean later and you pay for the fuel. ``T*``
is the balance point, and ``net_saving_usd`` is what servicing at ``T*`` saves against
waiting for the 8 % trigger.

``fact_maintenance_recommendation`` broadens that from hull cleaning to the five actions,
each with a forecast ``due_day`` (a Theil-Sen crossing of its own degradation threshold)
and each folded into a batched **service window** — a ship does not make five separate
trips to have five things done.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import epoch
from ym_datalake.etl.curated import trends
from ym_datalake.etl.curated.daily import HULL_RESETS
from ym_datalake.etl.curated.indicators import MT_TRIGGER_PCT

# ESTIMATED (USD). Full cost of an event = cash + downtime at the vessel's day rate.
EVENT_COST_USD = {'UWC': 90_000.0, 'PP': 30_000.0, 'DD': 1_400_000.0, 'UWI': 8_000.0}
EVENT_DOWNTIME_HOURS = {'UWC': 18.0, 'PP': 8.0, 'DD': 380.0, 'UWI': 4.0}
DOWNTIME_USD_PER_HOUR = 1_000.0

MIN_CYCLE_POINTS = 30
TRAILING_DAYS = 14
FORECAST_HORIZON_DAYS = 365

# Action thresholds. The propeller ones are legacy's (300 um polish / 430 um repair) driven
# by the synthesized roughness; the hull one is the real 8 % trigger.
THRESHOLDS = {
    'hull_cleaning': (MT_TRIGGER_PCT, '%/day'),
    'propeller_polishing': (300.0, 'um/day'),
    'propeller_repair': (430.0, 'um/day'),
    'coating_renewal': (45.0, '%/day'),
    'engine_inspection': (5.0, '%/day'),
}
DRY_DOCK_ACTIONS = {'coating_renewal', 'propeller_repair'}
# In-water actions fold into a dry-dock window within this reach, rather than making
# their own trip.
BATCH_WINDOW_DAYS = 60

PRIORITY_HORIZON_DAYS = {'high': 30, 'medium': 90, 'low': 180}
_SFOC_DRIFT_TRIGGER_PCT = 5.0


def _full_cost(event_type: str) -> float:
    return EVENT_COST_USD[event_type] + EVENT_DOWNTIME_HOURS[event_type] * DOWNTIME_USD_PER_HOUR


def build_recommendation(daily_rows: list[dict], events: list[dict]) -> list[dict]:
    """fact_recommendation: the closed-form optimal cleaning interval, one row per ship."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in daily_rows:
        by_ship[row['ship_id']].append(row)

    resets_by_ship: dict[str, list[int]] = defaultdict(list)
    for event in events:
        if event['event_type'] in HULL_RESETS:
            resets_by_ship[event['ship_id']].append(event['event_day'])

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        last_day = rows[-1]['noon_utc']
        resets = sorted(resets_by_ship[ship_id])
        last_clean = max([d for d in resets if d <= last_day], default=rows[0]['noon_utc'])

        # The OPEN cycle: everything since the last hull reset. That is the only cycle whose
        # fouling rate is still being paid for.
        cycle = [
            r for r in rows if r['noon_utc'] >= last_clean and r['valid_flag'] and r.get('excess_cost_usd') is not None
        ]
        losses = [
            (float(r['noon_utc'] - last_clean), r['speed_loss_pct'])
            for r in rows
            if r['noon_utc'] >= last_clean and r['valid_flag'] and r.get('speed_loss_pct') is not None
        ]

        base = {
            'ship_id': ship_id,
            'last_cleaning_day': last_clean,
            'recommended_clean_day': None,
            'recommended_clean_date': None,
            'trigger_eta_day': None,
            't_star_days': None,
            'fouling_rate_pct_per_day': None,
            'net_saving_usd': None,
            'status': 'insufficient_history',
        }
        if len(cycle) < MIN_CYCLE_POINTS or len(losses) < MIN_CYCLE_POINTS:
            out.append(base)
            continue

        # beta: how fast the daily excess cost is climbing (USD/day/day).
        cost_fit = trends.theil_sen([(float(r['noon_utc'] - last_clean), r['excess_cost_usd']) for r in cycle])
        loss_fit = trends.theil_sen(losses)
        if cost_fit is None or loss_fit is None or cost_fit[0] <= 0.0:
            out.append(base | {'fouling_rate_pct_per_day': loss_fit[0] if loss_fit else None})
            out[-1]['status'] = 'insufficient_history'
            continue

        beta, alpha = cost_fit
        k = _full_cost('UWC')
        t_star = (2.0 * k / beta) ** 0.5
        trigger_offset = trends.crossing_day(losses, MT_TRIGGER_PCT)
        trigger_day = last_clean + trigger_offset if trigger_offset is not None else None

        # The saving from cleaning at T* instead of running to the 8 % trigger: the area
        # between the cost rate and the optimal average rate, over the days in between.
        net_saving = None
        if trigger_offset is not None and trigger_offset > t_star:
            j_star = k / t_star + alpha + beta * t_star / 2.0
            span = trigger_offset - t_star
            mean_cost = alpha + beta * (t_star + trigger_offset) / 2.0
            net_saving = max(0.0, (mean_cost - j_star) * span)

        out.append(
            {
                'ship_id': ship_id,
                'last_cleaning_day': last_clean,
                'recommended_clean_day': last_clean + round(t_star),
                'recommended_clean_date': epoch.to_date_str(last_clean + round(t_star)),
                'trigger_eta_day': trigger_day,
                't_star_days': t_star,
                'fouling_rate_pct_per_day': loss_fit[0],
                'net_saving_usd': net_saving,
                'status': 'ok',
            }
        )
    return out


def _latest_uwi(uwi_rows: list[dict], ship_id: str) -> dict | None:
    ship_rows = [u for u in uwi_rows if u['ship_id'] == ship_id]
    return max(ship_rows, key=lambda u: u['inspection_day']) if ship_rows else None


def _priority(due_day: int, last_day: int) -> str:
    horizon = due_day - last_day
    if horizon <= PRIORITY_HORIZON_DAYS['high']:
        return 'high'
    if horizon <= PRIORITY_HORIZON_DAYS['medium']:
        return 'medium'
    return 'low'


def _action(ship_id: str, action_type: str, due_day: int, last_day: int, **kwargs) -> dict:
    threshold, unit = THRESHOLDS[action_type]
    priority = _priority(due_day, last_day)
    row = {
        'ship_id': ship_id,
        'action_type': action_type,
        'priority': priority,
        'due_day': due_day,
        'due_date': epoch.to_date_str(due_day),
        'rationale': '',
        'source': 'uwi',
        'degradation_rate': None,
        'degradation_unit': unit,
        'current_value': None,
        'threshold_value': threshold,
        'trigger_eta_day': None,
        't_star_days': None,
        'net_saving_usd': None,
        'plan_day': None,
        'plan_date': None,
        'plan_service_type': None,
    }
    return row | kwargs


def build_maintenance_recommendation(
    daily_rows: list[dict],
    uwi_rows: list[dict],
    anomalies: list[dict],
    recommendations: list[dict],
) -> list[dict]:
    """fact_maintenance_recommendation: every action a ship actually needs, batched into windows."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in daily_rows:
        by_ship[row['ship_id']].append(row)
    reco_by_ship = {r['ship_id']: r for r in recommendations}

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        last_day = rows[-1]['noon_utc']
        valid = [r for r in rows if r['valid_flag']]
        actions: list[dict] = []

        # --- hull cleaning: straight from the cost model ------------------------------
        reco = reco_by_ship.get(ship_id)
        if reco and reco['status'] == 'ok':
            due = reco['recommended_clean_day']
            # Already overdue? Then the deadline is the trigger, not a date in the past.
            if due < last_day:
                due = reco['trigger_eta_day'] or last_day + PRIORITY_HORIZON_DAYS['high']
            losses = [(float(r['noon_utc']), r['speed_loss_pct']) for r in valid if r.get('speed_loss_pct') is not None]
            actions.append(
                _action(
                    ship_id,
                    'hull_cleaning',
                    max(due, last_day),
                    last_day,
                    source='fouling_model',
                    degradation_rate=reco['fouling_rate_pct_per_day'],
                    current_value=trends.trailing_mean([(int(d), v) for d, v in losses], last_day, TRAILING_DAYS),
                    trigger_eta_day=reco['trigger_eta_day'],
                    t_star_days=reco['t_star_days'],
                    net_saving_usd=reco['net_saving_usd'],
                    rationale=(
                        f'fouling cost model recommends cleaning by day {reco["recommended_clean_day"]}; '
                        f'8% speed-loss trigger ETA day {reco["trigger_eta_day"]}'
                    ),
                )
            )

        # --- propeller: the synthesized roughness against legacy's 300/430 um ----------
        uwi = _latest_uwi(uwi_rows, ship_id)
        propeller_anomalies = sum(
            1
            for a in anomalies
            if a['ship_id'] == ship_id and a['cause'] == 'propeller' and a['noon_utc'] > last_day - 180
        )
        if uwi:
            roughness = uwi['propeller_roughness_um']
            # Roughness grows from the last polish; the rate is what the inspections imply.
            history = [
                (float(u['inspection_day']), u['propeller_roughness_um']) for u in uwi_rows if u['ship_id'] == ship_id
            ]
            rate = (trends.theil_sen(history) or (0.0, 0.0))[0]
            for action_type in ('propeller_polishing', 'propeller_repair'):
                threshold, _ = THRESHOLDS[action_type]
                if roughness < threshold and rate <= 0.0:
                    continue
                eta = trends.crossing_day(history, threshold)
                if roughness >= threshold:
                    due = last_day + PRIORITY_HORIZON_DAYS['high']
                elif eta is None or eta > last_day + FORECAST_HORIZON_DAYS:
                    continue
                else:
                    due = eta
                source = 'uwi+anomaly' if propeller_anomalies else 'uwi'
                detail = f'; {propeller_anomalies} propeller anomalies in 180d' if propeller_anomalies else ''
                actions.append(
                    _action(
                        ship_id,
                        action_type,
                        max(due, last_day),
                        last_day,
                        source=source,
                        degradation_rate=rate,
                        current_value=roughness,
                        trigger_eta_day=eta,
                        rationale=(
                            f'propeller condition {uwi["propeller_condition"] or "ungraded"}, '
                            f'roughness {roughness:.0f}um vs {threshold:.0f}um{detail}'
                        ),
                    )
                )

            # --- coating: the synthesized breakdown against 45 % ----------------------
            breakdown = uwi['coating_breakdown_pct']
            coating_history = [
                (float(u['inspection_day']), u['coating_breakdown_pct']) for u in uwi_rows if u['ship_id'] == ship_id
            ]
            threshold, _ = THRESHOLDS['coating_renewal']
            eta = trends.crossing_day(coating_history, threshold)
            if breakdown >= threshold or (eta is not None and eta <= last_day + FORECAST_HORIZON_DAYS):
                due = last_day + PRIORITY_HORIZON_DAYS['medium'] if breakdown >= threshold else (eta or last_day)
                actions.append(
                    _action(
                        ship_id,
                        'coating_renewal',
                        max(due, last_day),
                        last_day,
                        source='uwi',
                        degradation_rate=(trends.theil_sen(coating_history) or (0.0, 0.0))[0],
                        current_value=breakdown,
                        trigger_eta_day=eta,
                        rationale=(
                            f'coating condition {uwi["hull_coating_condition"] or "ungraded"}, '
                            f'breakdown {breakdown:.0f}% vs {threshold:.0f}%'
                        ),
                    )
                )

        # --- engine: SFOC drift against its own early-history baseline ------------------
        sfoc = [(float(r['noon_utc']), r['sfoc_g_kwh']) for r in valid if r.get('sfoc_g_kwh') is not None]
        if len(sfoc) >= MIN_CYCLE_POINTS:
            early = sorted(v for _, v in sfoc[: max(len(sfoc) // 3, MIN_CYCLE_POINTS)])
            baseline = early[len(early) // 2]
            trailing = trends.trailing_mean([(int(d), v) for d, v in sfoc], last_day, TRAILING_DAYS)
            if trailing and baseline > 0:
                drift_pct = (trailing - baseline) / baseline * 100.0
                if drift_pct >= _SFOC_DRIFT_TRIGGER_PCT:
                    actions.append(
                        _action(
                            ship_id,
                            'engine_inspection',
                            last_day + PRIORITY_HORIZON_DAYS['medium'],
                            last_day,
                            source='sfoc_trend',
                            degradation_rate=(trends.theil_sen(sfoc) or (0.0, 0.0))[0],
                            current_value=drift_pct,
                            rationale=(
                                f'trailing SFOC {trailing:.1f} g/kWh is {drift_pct:.1f}% above the '
                                f'{baseline:.1f} g/kWh early baseline'
                            ),
                        )
                    )

        out.extend(_plan(actions))
    return out


def _plan(actions: list[dict]) -> list[dict]:
    """Batch the scattered due dates into shared service windows.

    Dry-dock actions anchor a window on their earliest due date; in-water actions fold
    into the nearest dry-dock window within +/-60 days, else batch among themselves. Every
    action in a window carries the window's ``plan_day`` and ``plan_service_type``, so the
    dashboard can group flat rows into "the next time this ship goes in".
    """
    if not actions:
        return []
    dry_dock = [a for a in actions if a['action_type'] in DRY_DOCK_ACTIONS]
    in_water = [a for a in actions if a['action_type'] not in DRY_DOCK_ACTIONS]

    if dry_dock:
        anchor = min(a['due_day'] for a in dry_dock)
        for action in dry_dock:
            action['plan_day'] = anchor
            action['plan_service_type'] = 'dry_dock'
        for action in in_water:
            if abs(action['due_day'] - anchor) <= BATCH_WINDOW_DAYS:
                action['plan_day'] = anchor
                action['plan_service_type'] = 'dry_dock'

    unplanned = [a for a in in_water if a['plan_day'] is None]
    if unplanned:
        anchor = min(a['due_day'] for a in unplanned)
        for action in unplanned:
            action['plan_day'] = anchor
            action['plan_service_type'] = 'in_water'

    for action in actions:
        action['plan_date'] = epoch.to_date_str(action['plan_day'])
    return actions
