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
each with a forecast ``due_day`` (a crossing of its own degradation threshold) and each
folded into a batched **service window** — a ship does not make five separate trips to have
five things done.

**When to fold, in closed form.** A dry dock resets the hull anyway (``DD`` is in
``HULL_RESETS``), so folding an in-water job into one is marginally free — but *waiting* for
the dock burns fuel. Price both sides. With ``u`` the day we would otherwise act and ``v`` the
dock, both measured in cycle-time from the last cleaning::

    A (own trip at u, free reset at v)  =  K + alpha.(v-u) + beta.(v-u)^2/2
    B (defer to v)                      =      alpha.(v-u) + beta.(v^2-u^2)/2
    B - A                               =  beta.u.(v-u) - K

``alpha`` and the quadratic cancel exactly, leaving::

    fold iff  beta.u.(v-u) < K

``beta.u`` is literally today's excess burn rate, so the rule reads: *the extra fuel burned
while waiting is cheaper than the trip you would avoid.* ``K`` is **the trip avoided**, not
"the action's cost" — an ``engine_inspection`` needs no trip, so folding it saves nothing and
it can never be worth deferring. That falls out of the rule rather than needing a constant.

Note ``u = due_day - last_cleaning_day``, which is ``max(T*, days fouled today)`` — *not* ``T*``.
You cannot clean in the past, and most of the fleet is already past its ``T*``; anchoring the
rule on ``T*`` would put the entire fold window in history and never fold anything.

An action whose deferral we cannot price (``propeller_polishing``: there is no USD-per-micron
coefficient in this dataset, and inventing one would be inventing physics) is never deferred —
see ``UNPRICED_SLIP_DAYS``.

**Costs, and the double-count guard.** ``propeller_repair`` and ``coating_renewal`` both require
a dry dock; summing their costs naively would bill two docks for one trip. So ``action_cost_usd``
is **marginal** — each distinct event a window requires is charged to exactly one action, and
every other action in that window is genuinely free (0.0). It is therefore safe to sum at every
level: row, window, ship, fleet. ``window_cost_usd`` is the whole trip repeated on each row of
the window; dedupe on ``window_id`` before summing *that*. ROI is then two naive sums:
``sum(net_saving_usd) / sum(action_cost_usd)``.

*Stated limit*: an in-water window sums its distinct event costs, which is an **upper bound** —
``EVENT_COST_USD`` has no notion of a diver mobilisation shared between a cleaning and a polish.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import epoch
from ym_datalake.etl.curated import trends
from ym_datalake.etl.curated.daily import HULL_RESETS
from ym_datalake.etl.curated.indicators import MT_TRIGGER_PCT
from ym_datalake.etl.raw.uwi import CLEAN_COATING_PCT, CLEAN_ROUGHNESS_UM

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

# The event each action requires — the trip the break-even prices. `engine_inspection` needs
# none: no yard, no divers, no trip to avoid.
_ACTION_EVENT: dict[str, str | None] = {
    'hull_cleaning': 'UWC',
    'propeller_polishing': 'PP',
    'propeller_repair': 'DD',
    'coating_renewal': 'DD',
    'engine_inspection': None,
}
# A dry dock hauls the hull out and cleans and polishes on the way (DD is in both HULL_RESETS
# and POLISH_RESETS). A UWC or PP folded into a DD window is therefore genuinely free, and
# charging for both would bill two trips for one dock.
_SUBSUMED_BY_DRY_DOCK = {'UWC', 'PP'}

# How far an action whose deferral cost we cannot price may slip past its due date to catch a
# dry dock. Zero, deliberately: never defer what you cannot price. Pulling an action *forward*
# onto a dock is always free and is not governed by this — see `_folds_into_dock`.
UNPRICED_SLIP_DAYS = 0

PRIORITY_HORIZON_DAYS = {'high': 30, 'medium': 90}
_SFOC_DRIFT_TRIGGER_PCT = 5.0
# The trailing window the SFOC trend is fitted on. Every other action is fitted on the window
# it is about, and this pairs with the 14-day trailing `current_value` the drift is measured
# from — a slope taken over all ~1,800 days answers a question nobody asked.
_SFOC_FIT_DAYS = 365
# A point 50 days after a polish has enormous leverage on an anchored slope (y - R0) / x.
_MIN_FIT_CLOCK_DAYS = 60


def full_cost(event_type: str) -> float:
    """Cash + downtime at the vessel's day rate. ESTIMATED — the source records neither."""
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
            'cost_slope_usd_per_day2': None,
            'days_overdue': None,
            'net_saving_usd': None,
            'saving_horizon_days': None,
            'saving_if_cleaned_now_usd': None,
            'status': 'insufficient_history',
        }
        if len(cycle) < MIN_CYCLE_POINTS or len(losses) < MIN_CYCLE_POINTS:
            out.append(base)
            continue

        # beta: how fast the daily excess cost is climbing (USD/day/day).
        cost_fit = trends.theil_sen([(float(r['noon_utc'] - last_clean), r['excess_cost_usd']) for r in cycle])
        loss_fit = trends.theil_sen(losses)
        if cost_fit is None or loss_fit is None or cost_fit[0] <= 0.0:
            # No usable cost model — but the fouling rate is a measurement, and still true.
            out.append(base | {'fouling_rate_pct_per_day': loss_fit[0] if loss_fit else None})
            continue

        beta, alpha = cost_fit
        k = full_cost('UWC')
        t_star = (2.0 * k / beta) ** 0.5
        # `crossing_at`, not `crossing_day`: `losses` is already fitted, and Theil-Sen is O(n^2).
        trigger_offset = trends.crossing_at(loss_fit, MT_TRIGGER_PCT)
        trigger_day = last_clean + trigger_offset if trigger_offset is not None else None

        optimum_day = last_clean + round(t_star)
        days_overdue = max(0, last_day - optimum_day)
        # u: the day we could actually clean, in cycle-time. Past T* that is *today*, because
        # you cannot clean in the past — the same number the batching break-even rides on.
        u = max(round(t_star), last_day - last_clean)

        # The saving from cleaning at T* instead of running to the 8 % trigger: the area between
        # the cost rate and the optimal average rate, over the days in between.
        #
        # The span is CAPPED at the forecast horizon. S1's 8 % trigger sits 1,968 days into the
        # cycle — 3.1 years past the last day we have any data for — and pricing a counterfactual
        # that far out is not a valuation, it is an extrapolation artifact (and a perverse one:
        # the flatter the hull, the later the trigger, the *bigger* the "saving"). The bound is
        # the one propeller and coating already forecast against, so this removes an
        # inconsistency rather than adding a constant. `trigger_eta_day` itself is NOT capped —
        # it is a forecast of a physical event and is consumed as one.
        net_saving = saving_horizon = None
        if trigger_offset is not None:
            span_end = min(trigger_offset, (last_day - last_clean) + FORECAST_HORIZON_DAYS)
            if span_end > t_star:
                j_star = k / t_star + alpha + beta * t_star / 2.0
                mean_cost = alpha + beta * (t_star + span_end) / 2.0
                saving_horizon = span_end - t_star
                net_saving = max(0.0, (mean_cost - j_star) * saving_horizon)

        out.append(
            {
                'ship_id': ship_id,
                'last_cleaning_day': last_clean,
                'recommended_clean_day': optimum_day,
                'recommended_clean_date': epoch.to_date_str(optimum_day),
                'trigger_eta_day': trigger_day,
                't_star_days': t_star,
                'fouling_rate_pct_per_day': loss_fit[0],
                'cost_slope_usd_per_day2': beta,
                'days_overdue': days_overdue,
                'net_saving_usd': net_saving,
                'saving_horizon_days': saving_horizon,
                # The PROSPECTIVE number, and the honest one to rank an overdue backlog by:
                # clean today and you stop burning beta.u per day for the next year, having
                # paid K to do it. `net_saving_usd` prices a counterfactual against a trigger
                # that, for an overdue ship, is a date nobody intends to reach.
                'saving_if_cleaned_now_usd': beta * u * FORECAST_HORIZON_DAYS - k,
                'status': 'ok',
            }
        )
    return out


def _degradation_fit(
    uwi_rows: list[dict], clock_key: str, censored_key: str, value_key: str, origin_y: float
) -> tuple[float, float] | None:
    """(slope, intercept) for a signal that a service **resets**, fitted in CLOCK space.

    The x-axis is days since the reset, never the absolute day. Roughness does not grow from
    the day the ship was built; it grows from the last polish, and a fit against absolute day
    draws one line straight through every polish in the record. (``build_recommendation``
    already does exactly this for the hull; the propeller and coating were the only fits in the
    lake still taken against absolute day.)

    The intercept is **anchored** on the known post-reset value wherever a reset was observed —
    a freshly polished propeller *is* ~150 um. That needs one point, where a free fit needs two.

    A free Theil-Sen fit is used **only** where the record holds no reset for this signal at all
    (the five ships that have never dry-docked have no coating origin, so it must be estimated).
    Never as a fallback for a non-positive anchored rate: the censored points sit on cycles with
    different unknown origins, and pooling them fits nothing.
    """
    usable = [r for r in uwi_rows if r[clock_key] >= _MIN_FIT_CLOCK_DAYS]
    anchored = [r for r in usable if not r[censored_key]]
    if anchored:
        slope = trends.anchored_slope([(float(r[clock_key]), r[value_key]) for r in anchored], origin_y)
        return (slope, origin_y) if slope is not None else None
    if all(r[censored_key] for r in uwi_rows):
        return trends.theil_sen([(float(r[clock_key]), r[value_key]) for r in usable])
    return None


def _priority(due_day: int, last_day: int, days_overdue: int) -> str:
    """Overdue is always ``high``.

    Redundant by construction — an overdue action's ``due_day`` is clamped to ``last_day``, so
    its horizon is 0 and it lands in the ``high`` band anyway. It is spelled out so the invariant
    is directly assertable, and so it can never silently regress the way it did before.
    """
    if days_overdue > 0:
        return 'high'
    horizon = due_day - last_day
    if horizon <= PRIORITY_HORIZON_DAYS['high']:
        return 'high'
    if horizon <= PRIORITY_HORIZON_DAYS['medium']:
        return 'medium'
    return 'low'


def _action(ship_id: str, action_type: str, due_day: int, last_day: int, days_overdue: int = 0, **kwargs) -> dict:
    threshold, unit = THRESHOLDS[action_type]
    row = {
        'ship_id': ship_id,
        'action_type': action_type,
        'priority': _priority(due_day, last_day, days_overdue),
        'due_day': due_day,
        'due_date': epoch.to_date_str(due_day),
        'days_overdue': days_overdue,
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
        # Filled by `_plan`, once the windows are known.
        'action_cost_usd': None,
        'window_cost_usd': None,
        'window_id': None,
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
    uwi_by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in uwi_rows:
        uwi_by_ship[row['ship_id']].append(row)
    anomalies_by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in anomalies:
        anomalies_by_ship[row['ship_id']].append(row)
    reco_by_ship = {r['ship_id']: r for r in recommendations}

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        today = rows[-1]
        last_day = today['noon_utc']
        valid = [r for r in rows if r['valid_flag']]
        actions: list[dict] = []

        # --- hull cleaning: straight from the cost model ------------------------------
        reco = reco_by_ship.get(ship_id)
        if reco and reco['status'] == 'ok':
            # No inversion. Past T* there is nothing left to defer to — every further day costs
            # beta.u — so the deadline is simply the first day you can actually clean: today.
            optimum = reco['recommended_clean_day']
            losses = [(float(r['noon_utc']), r['speed_loss_pct']) for r in valid if r.get('speed_loss_pct') is not None]
            actions.append(
                _action(
                    ship_id,
                    'hull_cleaning',
                    max(optimum, last_day),
                    last_day,
                    days_overdue=reco['days_overdue'],
                    source='fouling_model',
                    degradation_rate=reco['fouling_rate_pct_per_day'],
                    current_value=trends.trailing_mean([(int(d), v) for d, v in losses], last_day, TRAILING_DAYS),
                    trigger_eta_day=reco['trigger_eta_day'],
                    t_star_days=reco['t_star_days'],
                    net_saving_usd=reco['net_saving_usd'],
                    rationale=(
                        f'fouling cost model recommends cleaning by day {optimum}; '
                        f'8% speed-loss trigger ETA day {reco["trigger_eta_day"]}'
                    ),
                )
            )

        # --- propeller: the synthesized roughness against legacy's 300/430 um ----------
        ship_uwi = uwi_by_ship[ship_id]
        latest = max(ship_uwi, key=lambda u: u['inspection_day']) if ship_uwi else None
        propeller_anomalies = sum(
            1 for a in anomalies_by_ship[ship_id] if a['cause'] == 'propeller' and a['noon_utc'] > last_day - 180
        )
        if ship_uwi:
            # Fitted on the polish clock, and evaluated at TODAY's clock — not at the last
            # inspection's reading. 31 of the 43 UWI atoms are the pre-polish state that
            # justified the polish, so quoting the last reading as "current" reports the
            # roughness of a propeller that has since been cleaned.
            prop_fit = _degradation_fit(
                ship_uwi, 'days_since_polish', 'polish_cycle_censored', 'propeller_roughness_um', CLEAN_ROUGHNESS_UM
            )
            clock = today['days_since_polish']
            rate = prop_fit[0] if prop_fit else None
            roughness = prop_fit[0] * clock + prop_fit[1] if prop_fit else None
            source = 'uwi+anomaly' if propeller_anomalies else 'uwi'
            detail = f'; {propeller_anomalies} propeller anomalies in 180d' if propeller_anomalies else ''
            grade = (latest or {}).get('propeller_condition')

            threshold, _ = THRESHOLDS['propeller_polishing']
            if roughness is not None and prop_fit is not None:
                offset = trends.crossing_at(prop_fit, threshold)
                eta = last_day - clock + offset if offset is not None else None
                due = None
                if roughness >= threshold:
                    due = last_day + PRIORITY_HORIZON_DAYS['high']
                elif eta is not None and eta <= last_day + FORECAST_HORIZON_DAYS:
                    due = eta
                if due is not None:
                    actions.append(
                        _action(
                            ship_id,
                            'propeller_polishing',
                            max(due, last_day),
                            last_day,
                            source=source,
                            degradation_rate=rate,
                            current_value=roughness,
                            trigger_eta_day=eta,
                            rationale=(
                                f'propeller condition {grade or "ungraded"}, roughness '
                                f'{roughness:.0f}um vs {threshold:.0f}um at {clock}d since polish{detail}'
                            ),
                        )
                    )

            # Repair is NOT forecast. A polish resets the clock, so extrapolating the roughness
            # line *through* a polish until it reaches 430 um draws a trend across a reset — not
            # physics. Repair is emitted on evidence that is true today: the level, the damage
            # grade, or observed cavitation.
            repair_threshold, _ = THRESHOLDS['propeller_repair']
            cavitation = str((latest or {}).get('cavitation_found') or '').strip().lower() == 'yes'
            breached = roughness is not None and roughness >= repair_threshold
            if latest and (breached or grade == 'Poor' or cavitation):
                evidence = ', '.join(
                    filter(
                        None,
                        (
                            f'roughness {roughness:.0f}um vs {repair_threshold:.0f}um' if breached else '',
                            'condition Poor' if grade == 'Poor' else '',
                            'cavitation found' if cavitation else '',
                        ),
                    )
                )
                actions.append(
                    _action(
                        ship_id,
                        'propeller_repair',
                        last_day + PRIORITY_HORIZON_DAYS['high'],
                        last_day,
                        source=source,
                        degradation_rate=rate,
                        current_value=roughness,
                        rationale=f'propeller damage evidence: {evidence}{detail}',
                    )
                )

            # --- coating: the synthesized breakdown against 45 % ----------------------
            coat_fit = _degradation_fit(
                ship_uwi, 'days_since_dry_dock', 'dry_dock_cycle_censored', 'coating_breakdown_pct', CLEAN_COATING_PCT
            )
            threshold, _ = THRESHOLDS['coating_renewal']
            if coat_fit is not None:
                clock = today['days_since_dry_dock']
                breakdown = coat_fit[0] * clock + coat_fit[1]
                offset = trends.crossing_at(coat_fit, threshold)
                eta = last_day - clock + offset if offset is not None else None
                due = None
                if breakdown >= threshold:
                    due = last_day + PRIORITY_HORIZON_DAYS['medium']
                elif eta is not None and eta <= last_day + FORECAST_HORIZON_DAYS:
                    due = eta
                if due is not None:
                    actions.append(
                        _action(
                            ship_id,
                            'coating_renewal',
                            max(due, last_day),
                            last_day,
                            source='uwi',
                            degradation_rate=coat_fit[0],
                            current_value=breakdown,
                            trigger_eta_day=eta,
                            rationale=(
                                f'coating condition {(latest or {}).get("hull_coating_condition") or "ungraded"}, '
                                f'breakdown {breakdown:.0f}% vs {threshold:.0f}% at {clock}d since dry dock'
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
                    recent = [(d, v) for d, v in sfoc if d > last_day - _SFOC_FIT_DAYS]
                    actions.append(
                        _action(
                            ship_id,
                            'engine_inspection',
                            last_day + PRIORITY_HORIZON_DAYS['medium'],
                            last_day,
                            source='sfoc_trend',
                            degradation_rate=(trends.theil_sen(recent) or (0.0, 0.0))[0],
                            current_value=drift_pct,
                            rationale=(
                                f'trailing SFOC {trailing:.1f} g/kWh is {drift_pct:.1f}% above the '
                                f'{baseline:.1f} g/kWh early baseline'
                            ),
                        )
                    )

        out.extend(_plan(actions, reco))
    return out


def _deferral_cost_usd(action: dict, slip_days: int, reco: dict | None) -> float | None:
    """USD burned by waiting ``slip_days`` past this action's due date. ``None`` = cannot price it.

    Only the hull has a USD-per-day-of-delay: ``beta.u``, the excess burn rate it is running at
    on its due day. There is no USD-per-micron coefficient in this dataset for a propeller, and
    inventing one would be inventing physics.
    """
    if action['action_type'] != 'hull_cleaning' or not reco or reco.get('cost_slope_usd_per_day2') is None:
        return None
    u = action['due_day'] - reco['last_cleaning_day']
    return reco['cost_slope_usd_per_day2'] * u * slip_days


def _folds_into_dock(action: dict, anchor: int, reco: dict | None) -> bool:
    """Is folding this in-water action into the dry dock cheaper than giving it its own trip?

    ``B - A = beta.u.(v-u) - K`` — the derivation is in the module docstring.
    """
    slip = anchor - action['due_day']
    if slip <= 0:
        # The dock lands on or before the due day: a free ride. Doing the job early crosses no
        # threshold and the trip is happening anyway, so earlier is never worse — no distance
        # limit applies, and the old rule's backward +/-60 day reach was never needed.
        return True
    deferral = _deferral_cost_usd(action, slip, reco)
    if deferral is None:
        return slip <= UNPRICED_SLIP_DAYS  # never defer what we cannot price
    trip = _ACTION_EVENT[action['action_type']]
    return deferral < (full_cost(trip) if trip else 0.0)


def _required_event(action_type: str, service_type: str) -> str | None:
    """The event this action requires **on top of** what its window is already doing.

    In a dry-dock window a cleaning or a polish requires nothing extra — the dock hauls the hull
    out and does both on the way — so it is genuinely free, and the dock itself is charged to the
    action that actually demands one (a repair or a coating renewal).
    """
    event = _ACTION_EVENT[action_type]
    if service_type == 'dry_dock' and event in _SUBSUMED_BY_DRY_DOCK:
        return None
    return event


def _charge(actions: list[dict]) -> None:
    """Price each window once, and attribute it so that summing rows never double-counts.

    Every distinct event a window requires is charged to exactly one action (the earliest due),
    and every other action in the window is marginally free. So a dry dock is billed once even
    though ``propeller_repair`` and ``coating_renewal`` both demand one, and a hull cleaning
    folded into that dock costs nothing at all — which is precisely why it folded.
    """
    windows: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for action in actions:
        windows[(action['plan_day'], action['plan_service_type'])].append(action)

    for (plan_day, service_type), members in windows.items():
        charged: set[str] = set()
        for action in sorted(members, key=lambda a: (a['due_day'], a['action_type'])):
            event = _required_event(action['action_type'], service_type)
            if event is None or event in charged:
                action['action_cost_usd'] = 0.0
            else:
                charged.add(event)
                action['action_cost_usd'] = full_cost(event)
        total = sum(a['action_cost_usd'] for a in members)
        for action in members:
            action['window_cost_usd'] = total
            action['window_id'] = f'W-{action["ship_id"]}-{plan_day}-{service_type}'


def _plan(actions: list[dict], reco: dict | None) -> list[dict]:
    """Batch the scattered due dates into shared service windows, and price them.

    Dry-dock actions anchor a window on their earliest due date. An in-water action folds into
    it when the cost model says folding is cheaper than its own trip (``_folds_into_dock``);
    otherwise it batches with the other in-water leftovers. That leftover batch anchors on the
    *earliest* due day among its members, so no member is ever pushed past its own deadline and
    it needs no break-even of its own.

    Every action in a window carries the window's ``plan_day`` / ``plan_service_type`` /
    ``window_id``, so the dashboard can group flat rows into "the next time this ship goes in".
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
            if _folds_into_dock(action, anchor, reco):
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
    _charge(actions)
    return actions
