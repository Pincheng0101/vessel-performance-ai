"""§5.4 maintenance-effect enrichment + §5.5 optimal-cleaning recommendation (M3).

``enrich_maintenance`` patches each ``fact_maintenance_event`` with its ISO 19030
ME recovery (reusing the period-indicator rows) and a fuel-savings payback.
``recommend`` fits the open cycle's daily excess-cost rate ``c(t)=α+βt`` and the
speed-loss trend, then minimises the cycle cost rate ``J(T)=K/T+α+βT/2`` in
closed form (``T*=√(2K/β)``) to emit one hull-cleaning recommendation per vessel.
``recommend_actions`` broadens that into overall maintenance actions (hull
cleaning, propeller polishing/repair, coating renewal, engine inspection), each
with a **genuine predictive due date**: it fits every independent degradation
signal (propeller roughness, coating breakdown, engine SFOC drift) over its own
reset clock (propeller_polishing / coating_renewal / engine_overhaul ∪ dry_dock)
and extrapolates when it will cross the action threshold — falling back to a
priority horizon so a due date is never null.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from ym_datalake.etl import periods, trends
from ym_datalake.synthetic_data.fleet import VesselSpec

ME_WINDOW_DAYS = 30
# POC downtime cost: a Neo-Panamax off-hire runs ~$25k/day ≈ $1000/h.
_DOWNTIME_USD_PER_HR = 1000.0
_MIN_OPEN_PTS = 30  # a cold-start / thin open cycle cannot be optimised

# --- maintenance-action recommendation (per-action forecast models) ----------
# ``recommend_actions`` fits each independent degradation signal (propeller
# roughness, coating breakdown, engine SFOC drift) over its own reset clock and
# extrapolates a genuine predictive due date, alongside the hull-cleaning cost
# model (``recommend``) and the trailing anomaly causes.
_ANOMALY_WINDOW_DAYS = 180  # trailing window for counting anomalies by cause
_HULL_CLEAN_RATING = 60  # UWI hull_fouling_rating at/above this ⇒ cleaning due
_HULL_CLEAN_SOON_DAYS = 60  # trigger ETA within this horizon (or past) ⇒ high priority
_PROP_REPAIR_GRADES = frozenset({'E', 'F'})  # Rubert propeller grades needing repair
_PROP_POLISH_GRADES = frozenset({'C', 'D'})  # Rubert propeller grades needing polishing
_PROP_POLISH_UM = 300.0  # forecast target / band onset for propeller polishing
_PROP_REPAIR_UM = 430.0  # forecast target / band onset for propeller repair
_COATING_POOR_PCT = 45.0  # forecast target: coating breakdown ⇒ renewal (poor)
_ENGINE_SFOC_LOSS = 0.05  # forecast target: +5 % SFOC efficiency loss ⇒ inspection
_FORECAST_HORIZON_DAYS = 180  # emit a predictive action when the crossing is within this
_HORIZON_DAYS = {'high': 30, 'medium': 90, 'low': 180}  # fallback due offsets from latest report
_DUE_CAP_DAYS = {'high': 90, 'medium': 365, 'low': 730}  # a due date never sits implausibly far for its priority

# --- consolidated maintenance planner (batch per-action due dates into windows) ---
# Each action's category decides whether it needs a haul-out: dry-dock actions are the
# constraining event a window anchors on; in-water actions can fold into a nearby dock
# window or batch among themselves.
_SERVICE_CATEGORY = {
    'coating_renewal': 'dry_dock',
    'propeller_repair': 'dry_dock',
    'hull_cleaning': 'in_water',
    'propeller_polishing': 'in_water',
    'engine_inspection': 'in_water',
}
_PLAN_BATCH_DAYS = 60  # actions whose due dates fall within this window are serviced together

# --- per-action economics (cost-rate slope β for the shared t*/net-saving model) ---
# Engine drift is data-driven (β grounded in observed SFOC); propeller/coating use a
# documented POC coefficient mapping the degradation signal to an excess main-engine
# power fraction (decoupled from the synthetic FOC, so an explicit modelling constant
# is required). Magnitudes are first-order POC guesses — tune during review.
_FLEET_FUEL_PRICE_USD_PER_MT = 600.0  # fallback fuel price when the excess-cost ratio is unavailable
_PROP_PENALTY_PER_UM = 0.0002  # excess ME power fraction per µm propeller roughness (~3% @ +150µm)
_COAT_PENALTY_PER_PCT = 0.0009  # excess ME power fraction per % coating breakdown (~4% @ 45%)


def _event_cost(event: dict) -> float:
    return event.get('cost_usd', 0.0) + event.get('downtime_hours', 0.0) * _DOWNTIME_USD_PER_HR


def _median_event_cost(events: list[dict], event_type: str) -> float | None:
    """Median full cost (cash + downtime) of ``event_type`` events, or None if none exist."""
    costs = [_event_cost(e) for e in events if e['event_type'] == event_type]
    return float(np.median(costs)) if costs else None


def hull_cleaning_cost(events: list[dict]) -> float | None:
    """Median full cost (cash + downtime) of hull cleanings, or None if none exist."""
    return _median_event_cost(events, 'hull_cleaning')


def fleet_event_costs(events: list[dict]) -> dict[str, float | None]:
    """Fleet-wide median full cost per event_type — the K fallback when a vessel has
    no matching service event of its own (parallels the hull ``fleet_k``)."""
    return {t: _median_event_cost(events, t) for t in {e['event_type'] for e in events}}


def _service_cost(events: list[dict], event_type: str, fleet_costs: dict[str, float | None] | None) -> float | None:
    """Event cost K for an action: this vessel's matching events, else the fleet median."""
    return _median_event_cost(events, event_type) or (fleet_costs or {}).get(event_type)


def enrich_maintenance(event_rows: list[dict], vessel_daily: list[dict], me_rows: list[dict]) -> None:
    """Fill ``me_recovery_pct`` / ``payback_days`` on this vessel's event rows in place."""
    me_idx = {
        (r['event_date'], r['event_type']): r for r in me_rows if r['indicator'] == 'ME' and r['event_date'] is not None
    }
    cost_by_date = {
        periods.to_date(r['report_date']): r['excess_cost_usd']
        for r in vessel_daily
        if r['excess_cost_usd'] is not None
    }
    for ev in event_rows:
        day = periods.to_date(ev['event_date'])
        me = me_idx.get((day.isoformat(), ev['event_type']))
        if me is not None and me['reference_value']:
            ev['me_recovery_pct'] = me['value'] / me['reference_value'] * 100.0
        ev['payback_days'] = _payback_days(ev, day, cost_by_date)


def _mean_cost(cost_by_date: dict, start: dt.date, end: dt.date) -> float | None:
    vals = [c for d, c in cost_by_date.items() if start <= d < end]
    return sum(vals) / len(vals) if vals else None


def _payback_days(event: dict, day: dt.date, cost_by_date: dict) -> float | None:
    before = _mean_cost(cost_by_date, day - dt.timedelta(days=ME_WINDOW_DAYS), day)
    after = _mean_cost(cost_by_date, day, day + dt.timedelta(days=ME_WINDOW_DAYS))
    if before is None or after is None:
        return None
    saving_per_day = before - after
    if saving_per_day <= 0:
        return None
    return _event_cost(event) / saving_per_day


def fit_cost_rate(
    open_cycle_daily: list[dict], rng: np.random.Generator | None = None
) -> tuple[float, float, float, float]:
    """Robust ``c(t)=α+βt`` of excess cost vs days-since-cleaning → (α, β, ci_lo, ci_hi)."""
    pts = [
        (r['days_since_cleaning'], r['excess_cost_usd']) for r in open_cycle_daily if r['excess_cost_usd'] is not None
    ]
    t = np.array([p[0] for p in pts], dtype=float)
    y = np.array([p[1] for p in pts], dtype=float)
    slope, intercept, lo, hi = trends.robust_line(t, y, rng)
    return intercept, slope, lo, hi


def _placeholder(imo: str, last_cleaning: dt.date | None, fouling_rate: float | None) -> dict:
    return {
        'imo_number': imo,
        'last_cleaning_date': last_cleaning.isoformat() if last_cleaning else None,
        'recommended_clean_date': None,
        'trigger_eta': None,
        't_star_days': None,
        'fouling_rate_pct_per_day': fouling_rate,
        'net_saving_usd': None,
        'status': 'insufficient_history',
    }


def recommend(
    vessel_daily: list[dict],
    events: list[dict],
    spec: VesselSpec,
    segments: list[trends.Segment],
    fleet_k: float | None,
    rng: np.random.Generator | None = None,
) -> dict:
    """One ``fact_recommendation`` row from the open cycle (§5.5)."""
    open_seg = segments[-1]
    open_rows = sorted(
        (
            r
            for r in vessel_daily
            if r['valid_flag'] and open_seg.start <= periods.to_date(r['report_date']) < open_seg.end
        ),
        key=lambda r: r['report_date'],
    )
    imo = spec.imo_number
    if not open_rows:
        return _placeholder(imo, None, open_seg.slope)

    last_row = open_rows[-1]
    last_cleaning = periods.to_date(last_row['report_date']) - dt.timedelta(days=last_row['days_since_cleaning'])

    priced = [r for r in open_rows if r['excess_cost_usd'] is not None]
    alpha, beta, ci_lo, ci_hi = fit_cost_rate(open_rows, rng)
    degenerate = len(priced) < _MIN_OPEN_PTS or beta <= 0.0 or (ci_lo <= 0.0 <= ci_hi)
    if degenerate:
        return _placeholder(imo, last_cleaning, open_seg.slope)

    k = hull_cleaning_cost(events) or fleet_k
    if not k:
        return _placeholder(imo, last_cleaning, open_seg.slope)

    trigger_eta = trends.extrapolate(open_seg, periods.MT_TRIGGER_PCT, last_cleaning)
    t_trigger = (dt.date.fromisoformat(trigger_eta) - last_cleaning).days if trigger_eta is not None else None
    t_star, _, net_saving = _optimal_service(alpha, beta, k, t_trigger)
    if t_star is None:  # unreachable (β>0, K>0 verified above) — guards the round() below
        return _placeholder(imo, last_cleaning, open_seg.slope)
    recommended = (last_cleaning + dt.timedelta(days=round(t_star))).isoformat()

    return {
        'imo_number': imo,
        'last_cleaning_date': last_cleaning.isoformat(),
        'recommended_clean_date': recommended,
        'trigger_eta': trigger_eta,
        't_star_days': t_star,
        'fouling_rate_pct_per_day': open_seg.slope,
        'net_saving_usd': net_saving,
        'status': 'ok',
    }


def _net_saving(alpha: float, beta: float, j_star: float, t0: float, t1: float) -> float:
    """∫_{t0}^{t1} (c(t) − J*) dt with c(t)=α+βt — saved cost of cleaning at T* vs the trigger."""
    integral = alpha * (t1 - t0) + beta * (t1**2 - t0**2) / 2.0 - j_star * (t1 - t0)
    return integral


def _optimal_service(
    alpha: float, beta: float, k: float | None, trigger_days: float | None
) -> tuple[float | None, float | None, float | None]:
    """Shared cost model: ``t*=√(2K/β)``, ``J*=K/t*+α+βt*/2``, and the net saving of
    servicing at ``t*`` vs waiting until ``trigger_days`` (None unless the trigger is later).

    Returns ``(t_star, j_star, net_saving)`` — all None when β/K make the model degenerate.
    """
    if beta is None or beta <= 0.0 or not k or k <= 0.0:
        return None, None, None
    t_star = float(np.sqrt(2.0 * k / beta))
    j_star = k / t_star + alpha + beta * t_star / 2.0
    net_saving = None
    if trigger_days is not None and trigger_days > t_star:
        net_saving = _net_saving(alpha, beta, j_star, t_star, float(trigger_days))
    return t_star, j_star, net_saving


# --- maintenance-action recommendation ---------------------------------------


def _action(
    imo: str,
    action_type: str,
    priority: str,
    rationale: str,
    source: str,
    due_date: str | None = None,
    *,
    degradation_rate: float | None = None,
    degradation_unit: str | None = None,
    current_value: float | None = None,
    threshold_value: float | None = None,
    trigger_eta: str | None = None,
    t_star_days: float | None = None,
    net_saving_usd: float | None = None,
) -> dict:
    """One ``fact_maintenance_recommendation`` row (grain: vessel × recommended action).

    The trailing keyword fields are the per-action analytics (parity with hull cleaning):
    the degradation rate + unit, current/threshold signal context, the threshold-crossing
    ETA, and — for economic actions — the optimal service interval and net saving.
    """
    return {
        'imo_number': imo,
        'action_type': action_type,
        'priority': priority,
        'due_date': due_date,
        'rationale': rationale,
        'source': source,
        'degradation_rate': degradation_rate,
        'degradation_unit': degradation_unit,
        'current_value': current_value,
        'threshold_value': threshold_value,
        'trigger_eta': trigger_eta,
        't_star_days': t_star_days,
        'net_saving_usd': net_saving_usd,
    }


def _anoms_phrase(n: int) -> str:
    return f'{n} anomaly' if n == 1 else f'{n} anomalies'


def _combine_source(*, uwi: bool, anomaly: bool) -> str:
    """Which evidence stream(s) triggered the action: uwi / anomaly / uwi+anomaly."""
    if uwi and anomaly:
        return 'uwi+anomaly'
    return 'uwi' if uwi else 'anomaly'


def _latest_report_date(vessel_daily: list[dict]) -> dt.date | None:
    dates = [r['report_date'] for r in vessel_daily if r.get('report_date')]
    return periods.to_date(max(dates)) if dates else None


def _window_start(vessel_daily: list[dict]) -> dt.date | None:
    """Earliest report date — the fallback anchor for a reset clock before its first
    event (matches the generator's ``build_uwi`` / ``engine_state`` window-start fallback)."""
    dates = [r['report_date'] for r in vessel_daily if r.get('report_date')]
    return periods.to_date(min(dates)) if dates else None


def _anomalies_in_window(anomaly_rows: list[dict], latest: dt.date | None) -> list[dict]:
    """Anomalies within the trailing ``_ANOMALY_WINDOW_DAYS`` before ``latest``."""
    if latest is None:
        return []
    cutoff = latest - dt.timedelta(days=_ANOMALY_WINDOW_DAYS)
    return [a for a in anomaly_rows if cutoff <= periods.to_date(a['report_date']) <= latest]


def _within_soon(eta: str | None, latest: dt.date | None) -> bool:
    """True if the trigger ETA falls within ``_HULL_CLEAN_SOON_DAYS`` (or is already past)."""
    if not eta or latest is None:
        return False
    return (periods.to_date(eta) - latest).days <= _HULL_CLEAN_SOON_DAYS


def _within_horizon(due: str | None, latest: dt.date | None) -> bool:
    """True if a forecast crossing falls within the planning horizon (or is already past)."""
    if not due or latest is None:
        return False
    return (periods.to_date(due) - latest).days <= _FORECAST_HORIZON_DAYS


def _horizon_due(latest: dt.date | None, priority: str) -> str | None:
    """Priority-based fallback due date (high +30d / medium +90d) from the latest report."""
    if latest is None:
        return None
    return (latest + dt.timedelta(days=_HORIZON_DAYS[priority])).isoformat()


def _future(due: str | None, latest: dt.date | None) -> str | None:
    """The forecast date iff it is a genuine future prediction (else None — for rationale)."""
    return due if (due and latest is not None and latest.isoformat() < due) else None


def _due_or_horizon(forecast: str | None, latest: dt.date | None, priority: str) -> str | None:
    """A genuine future forecast (within the priority's action window), else the horizon.

    A high-priority action is urgent *now* — its due date must not sit at a slow
    signal's distant crossing (e.g. the SFOC-drift +5% date years out); beyond the
    per-priority cap we surface the sooner horizon fallback instead.
    """
    if forecast is not None and latest is not None and latest.isoformat() < forecast:
        if (periods.to_date(forecast) - latest).days <= _DUE_CAP_DAYS[priority]:
            return forecast
    return _horizon_due(latest, priority)


def _robust_fit(points: list[tuple[float, float]]) -> tuple[float | None, float | None]:
    """Theil-Sen ``(slope, intercept)`` of ``value`` vs days-since-reset; (None, None) if
    too thin to fit. The slope is the action's **degradation rate** (per day)."""
    if len(points) < 2:
        return None, None
    slope, intercept, _, _ = trends.robust_line([p[0] for p in points], [p[1] for p in points])
    return slope, intercept


def _cross_date(reset: dt.date, slope: float | None, intercept: float | None, target: float) -> str | None:
    """Date the fitted line reaches ``target`` (None when flat/declining or unfittable)."""
    if slope is None or intercept is None or slope <= 0.0:
        return None
    dsc = (target - intercept) / slope
    return (reset + dt.timedelta(days=round(max(0.0, dsc)))).isoformat()


def _forecast_cross(reset: dt.date, points: list[tuple[float, float]], target: float) -> str | None:
    """Date the robust line of ``value`` vs days-since-``reset`` reaches ``target``.

    Fits Theil-Sen over cycle-relative points (pooled across cycles); returns None
    when the trend is flat/declining or too thin to fit (the caller then falls back
    to a priority horizon so a due date is never null).
    """
    slope, intercept = _robust_fit(points)
    return _cross_date(reset, slope, intercept, target)


def _days_to(reset: dt.date, date_iso: str | None) -> float | None:
    """Days from ``reset`` to ``date_iso`` (None when ``date_iso`` is None)."""
    return (dt.date.fromisoformat(date_iso) - reset).days if date_iso else None


def _foc_price(vessel_daily: list[dict]) -> tuple[float | None, float]:
    """(median daily main-engine FOC in mt, median fuel price in $/mt) from valid rows.

    Daily FOC ≈ ``sfoc·power·24h``; the price is the excess-cost/excess-foc ratio
    (fleet constant fallback). Their product is the baseline daily fuel spend that the
    per-action economics scale by the observed degradation to get the cost-rate slope β.
    """
    focs, prices = [], []
    for r in vessel_daily:
        if not r.get('valid_flag'):
            continue
        sfoc, power = r.get('sfoc_g_kwh'), r.get('power_corrected_kw')
        if sfoc is not None and power is not None:
            focs.append(sfoc * power * 24.0 / 1e6)  # g/kWh · kW · 24h → g/day → mt/day
        efoc, ecost = r.get('excess_foc_mt'), r.get('excess_cost_usd')
        if efoc and ecost is not None:
            prices.append(ecost / efoc)
    foc_med = float(np.median(focs)) if focs else None
    price_med = float(np.median(prices)) if prices else _FLEET_FUEL_PRICE_USD_PER_MT
    return foc_med, price_med


def _latest_valid_speed_loss(vessel_daily: list[dict]) -> float | None:
    """The most recent valid daily ``speed_loss_pct`` — the hull action's current value."""
    valid = [r for r in vessel_daily if r.get('valid_flag') and r.get('speed_loss_pct') is not None]
    return max(valid, key=lambda r: r['report_date'])['speed_loss_pct'] if valid else None


def _coefficient_economics(
    foc_price: tuple[float | None, float],
    k: float | None,
    penalty: float,
    slope: float | None,
    intercept: float | None,
    reset: dt.date,
    forecast_due: str | None,
) -> tuple[float | None, float | None]:
    """(t*, net_saving) for a coefficient-based economic action (POC modelling assumption).

    Excess ME power fraction ≈ ``penalty·signal`` ⇒ cost rate ``c(t)=α+βt`` with
    ``β=foc·price·penalty·slope`` and ``α=foc·price·penalty·intercept``; then the shared
    hull optimum. None unless the signal rises and an event cost K is available.
    """
    foc_med, price_med = foc_price
    if k is None or foc_med is None or slope is None or slope <= 0.0:
        return None, None
    daily_fuel = foc_med * price_med
    alpha = daily_fuel * penalty * max(0.0, intercept or 0.0)
    beta = daily_fuel * penalty * slope
    t_star, _, net_saving = _optimal_service(alpha, beta, k, _days_to(reset, forecast_due))
    return t_star, net_saving


def _cycle_points(
    rows: list[dict], date_key: str, value_key: str, resets: list[dt.date], start: dt.date
) -> list[tuple]:
    """Pooled ``(days_since_reset, value)`` points across all cycles of a reset clock."""
    pts: list[tuple] = []
    for r in rows:
        v = r.get(value_key)
        if v is None:
            continue
        d = periods.to_date(r[date_key])
        anchor = periods.latest_reset(d, resets, start)
        pts.append((max(0, (d - anchor).days), v))
    return pts


def _hull_cleaning_action(
    rec: dict, latest_uwi: dict | None, latest: dt.date | None, current_speed_loss: float | None
) -> dict | None:
    """Hull cleaning from the fouling cost model (preferred), else from a high UWI rating.

    The analytics (rate/ETA/t*/net-saving) are the vessel's already-computed hull cost
    model, carried on the row so it needs no join back to ``fact_recommendation``.
    """
    imo = rec['imo_number']
    rating = latest_uwi['hull_fouling_rating'] if latest_uwi else None
    metrics = {
        'degradation_rate': rec['fouling_rate_pct_per_day'],
        'degradation_unit': '%/day',
        'current_value': current_speed_loss,
        'threshold_value': periods.MT_TRIGGER_PCT,
        'trigger_eta': rec['trigger_eta'],
        't_star_days': rec['t_star_days'],
        'net_saving_usd': rec['net_saving_usd'],
    }
    if rec['status'] == 'ok':
        eta = rec['trigger_eta']
        rec_date = rec['recommended_clean_date']
        priority = 'high' if _within_soon(eta, latest) else 'medium'
        if _future(rec_date, latest):  # cost-optimal date still ahead — surface it directly
            due = rec_date
            parts = [f'fouling cost model recommends cleaning by {rec_date}']
        else:  # optimal window already passed — overdue; give a genuine future clean-by date
            due = _due_or_horizon(eta, latest, priority)
            parts = [f'overdue: cost-optimal clean was {rec_date}']
        if eta:
            parts.append(f'8% speed-loss trigger ETA {eta}')
        if rating is not None and rating >= _HULL_CLEAN_RATING:
            parts.append(f'UWI hull fouling rating {rating}')
        return _action(imo, 'hull_cleaning', priority, '; '.join(parts), 'fouling_model', due, **metrics)
    if rating is not None and rating >= _HULL_CLEAN_RATING:
        return _action(
            imo,
            'hull_cleaning',
            'medium',
            f'UWI hull fouling rating {rating}',
            'uwi',
            _horizon_due(latest, 'medium'),
            **metrics,
        )
    return None


def _propeller_action(
    imo: str,
    uwi_rows: list[dict],
    latest_uwi: dict | None,
    recent: list[dict],
    events: list[dict],
    latest: dt.date | None,
    start: dt.date | None,
    foc_price: tuple[float | None, float],
    fleet_costs: dict[str, float | None] | None,
) -> dict | None:
    """Propeller repair (rough/E-F or high-severity anomaly) suppresses polishing; each
    due date is the roughness trend's forecast to the repair (430µm) / polish (300µm) band.

    Roughness rate (µm/day) is the degradation rate; polishing carries a coefficient-based
    t*/net-saving, repair is a corrective floor (rate + ETA only)."""
    if latest is None or start is None:
        return None
    cond = latest_uwi['propeller_condition'] if latest_uwi else None
    roughness = latest_uwi.get('propeller_roughness_um') if latest_uwi else None
    anoms = [a for a in recent if a['cause'] == 'propeller']
    high_anom = any(a['severity'] == 'high' for a in anoms)

    resets = periods.reset_dates(events, imo, types=('propeller_polishing', 'dry_dock'))
    reset = periods.latest_reset(latest, resets, start)
    points = _cycle_points(uwi_rows, 'inspection_date', 'propeller_roughness_um', resets, start)
    slope, intercept = _robust_fit(points)
    polish_due = _cross_date(reset, slope, intercept, _PROP_POLISH_UM)
    repair_due = _cross_date(reset, slope, intercept, _PROP_REPAIR_UM)

    def evidence(due: str | None, band: str) -> str:
        parts = []
        if cond:
            parts.append(f'propeller condition Rubert {cond}')
        if roughness is not None:
            parts.append(f'roughness {round(roughness)}um')
        if due is not None:
            parts.append(f'roughness trend reaches {band} band by {due}')
        if anoms:
            sev = ' (high severity)' if high_anom else ''
            parts.append(f'{_anoms_phrase(len(anoms))} caused by propeller fouling{sev} in {_ANOMALY_WINDOW_DAYS}d')
        return '; '.join(parts)

    uwi_repair = cond in _PROP_REPAIR_GRADES or (roughness is not None and roughness >= _PROP_REPAIR_UM)
    if uwi_repair or high_anom:
        due = _due_or_horizon(repair_due, latest, 'high')
        rationale = evidence(_future(repair_due, latest), 'repair')
        return _action(
            imo,
            'propeller_repair',
            'high',
            rationale,
            _combine_source(uwi=uwi_repair, anomaly=high_anom),
            due,
            degradation_rate=slope,
            degradation_unit='µm/day',
            current_value=roughness,
            threshold_value=_PROP_REPAIR_UM,
            trigger_eta=repair_due,
        )

    forecast_soon = _within_horizon(polish_due, latest)
    uwi_polish = cond in _PROP_POLISH_GRADES or (roughness is not None and roughness >= _PROP_POLISH_UM)
    if uwi_polish or forecast_soon or anoms:
        due = _due_or_horizon(polish_due, latest, 'medium')
        source = _combine_source(uwi=uwi_polish or forecast_soon, anomaly=bool(anoms))
        k = _service_cost(events, 'propeller_polishing', fleet_costs)
        t_star, net_saving = _coefficient_economics(
            foc_price, k, _PROP_PENALTY_PER_UM, slope, intercept, reset, polish_due
        )
        return _action(
            imo,
            'propeller_polishing',
            'medium',
            evidence(_future(polish_due, latest), 'polish'),
            source,
            due,
            degradation_rate=slope,
            degradation_unit='µm/day',
            current_value=roughness,
            threshold_value=_PROP_POLISH_UM,
            trigger_eta=polish_due,
            t_star_days=t_star,
            net_saving_usd=net_saving,
        )
    return None


def _coating_action(
    imo: str,
    uwi_rows: list[dict],
    latest_uwi: dict | None,
    events: list[dict],
    latest: dt.date | None,
    start: dt.date | None,
    foc_price: tuple[float | None, float],
    fleet_costs: dict[str, float | None] | None,
) -> dict | None:
    """Coating renewal when breakdown is poor, or the breakdown trend forecasts crossing
    the poor band (45%) within the planning horizon. Breakdown rate (%/day) is the
    degradation rate; carries a coefficient-based t*/net-saving."""
    if latest is None or start is None:
        return None
    cond = latest_uwi['coating_condition'] if latest_uwi else None
    breakdown = latest_uwi.get('coating_breakdown_pct') if latest_uwi else None

    resets = periods.reset_dates(events, imo, types=('coating_renewal', 'dry_dock'))
    reset = periods.latest_reset(latest, resets, start)
    points = _cycle_points(uwi_rows, 'inspection_date', 'coating_breakdown_pct', resets, start)
    slope, intercept = _robust_fit(points)
    due_forecast = _cross_date(reset, slope, intercept, _COATING_POOR_PCT)

    poor = cond == 'poor' or (breakdown is not None and breakdown >= _COATING_POOR_PCT)
    if not (poor or _within_horizon(due_forecast, latest)):
        return None
    parts = []
    if breakdown is not None:
        parts.append(f'coating breakdown {round(breakdown)}%')
    if cond:
        parts.append(f'condition {cond}')
    if _future(due_forecast, latest) is not None:
        parts.append(f'breakdown trend reaches poor band by {due_forecast}')
    k = _service_cost(events, 'coating_renewal', fleet_costs)
    t_star, net_saving = _coefficient_economics(
        foc_price, k, _COAT_PENALTY_PER_PCT, slope, intercept, reset, due_forecast
    )
    return _action(
        imo,
        'coating_renewal',
        'medium',
        '; '.join(parts),
        'uwi',
        _due_or_horizon(due_forecast, latest, 'medium'),
        degradation_rate=slope,
        degradation_unit='%/day',
        current_value=breakdown,
        threshold_value=_COATING_POOR_PCT,
        trigger_eta=due_forecast,
        t_star_days=t_star,
        net_saving_usd=net_saving,
    )


def _engine_action(
    imo: str,
    recent: list[dict],
    vessel_daily: list[dict],
    events: list[dict],
    latest: dt.date | None,
    start: dt.date | None,
    foc_price: tuple[float | None, float],
    fleet_costs: dict[str, float | None] | None,
) -> dict | None:
    """Engine inspection from the SFOC drift trend (forecast to +5% efficiency loss) and/or
    trailing engine-degradation anomalies. High if anomalies present or already past +5%.

    Economics are data-driven: the fractional SFOC drift rate scales the daily fuel spend
    into the cost-rate slope β (grounded in observed SFOC), giving a t*/net-saving."""
    if latest is None or start is None:
        return None
    anoms = [a for a in recent if a['cause'] == 'engine_degradation']
    n = len(anoms)

    resets = periods.reset_dates(events, imo, types=('engine_overhaul', 'dry_dock'))
    reset = periods.latest_reset(latest, resets, start)
    cycle = [
        (max(0, (periods.to_date(r['report_date']) - reset).days), r['sfoc_g_kwh'])
        for r in vessel_daily
        if r.get('valid_flag')
        and r.get('sfoc_g_kwh') is not None
        and periods.latest_reset(periods.to_date(r['report_date']), resets, start) == reset
    ]
    due_forecast: str | None = None
    past_threshold = False
    drift_rate_pct: float | None = None  # fractional SFOC drift, expressed as %/day
    current_drift_pct: float | None = None  # current drift above the cycle baseline, %
    t_star = net_saving = None
    if len(cycle) >= 2:
        slope, intercept, _, _ = trends.robust_line([p[0] for p in cycle], [p[1] for p in cycle])
        if slope > 0.0 and intercept > 0.0:
            drift_frac_rate = slope / intercept  # per day
            drift_rate_pct = drift_frac_rate * 100.0
            last_sfoc = max(cycle, key=lambda p: p[0])[1]
            current_drift_pct = (last_sfoc - intercept) / intercept * 100.0
            target = intercept * (1.0 + _ENGINE_SFOC_LOSS)
            dsc = (target - intercept) / slope
            due_forecast = (reset + dt.timedelta(days=round(max(0.0, dsc)))).isoformat()
            past_threshold = last_sfoc >= target
            foc_med, price_med = foc_price
            k = _service_cost(events, 'engine_overhaul', fleet_costs)
            if foc_med is not None and k is not None:
                beta = foc_med * price_med * drift_frac_rate  # $/day² grounded in observed SFOC
                t_star, _, net_saving = _optimal_service(0.0, beta, k, _days_to(reset, due_forecast))

    forecast_soon = _within_horizon(due_forecast, latest)
    if not (n >= 1 or past_threshold or forecast_soon):
        return None
    priority = 'high' if (n >= 1 or past_threshold) else 'medium'
    parts = []
    if n >= 1:
        parts.append(f'{_anoms_phrase(n)} caused by engine degradation in {_ANOMALY_WINDOW_DAYS}d')
    pct = round(_ENGINE_SFOC_LOSS * 100)
    if past_threshold:
        parts.append(f'SFOC drift already exceeds +{pct}% efficiency loss')
    elif _future(due_forecast, latest) is not None:
        parts.append(f'SFOC drift reaches +{pct}% by {due_forecast}')
    source = 'anomaly' if n >= 1 else 'sfoc_trend'
    return _action(
        imo,
        'engine_inspection',
        priority,
        '; '.join(parts),
        source,
        _due_or_horizon(due_forecast, latest, priority),
        degradation_rate=drift_rate_pct,
        degradation_unit='%/day',
        current_value=current_drift_pct,
        threshold_value=_ENGINE_SFOC_LOSS * 100.0,
        trigger_eta=due_forecast,
        t_star_days=t_star,
        net_saving_usd=net_saving,
    )


def recommend_actions(
    uwi_rows: list[dict],
    anomaly_rows: list[dict],
    rec: dict,
    vessel_daily: list[dict],
    events: list[dict],
    fleet_event_costs: dict[str, float | None] | None = None,
) -> list[dict]:
    """Per-vessel maintenance actions, each with a forecast due date and analytics.

    Fits every independent degradation signal (propeller roughness, coating
    breakdown, engine SFOC drift) over its own reset clock (from ``events``) and
    extrapolates the due date, alongside the hull-cleaning cost model (``rec``) and
    trailing anomaly causes. Each row carries the same 4-metric shape as hull cleaning
    (degradation rate, threshold ETA, and — for economic actions — optimal service
    interval + net saving). ``fleet_event_costs`` is the K fallback when a vessel has
    no matching service event. One row per action; an empty list means up to date.
    """
    imo = rec['imo_number']
    latest_uwi = max(uwi_rows, key=lambda u: u['inspection_date']) if uwi_rows else None
    latest = _latest_report_date(vessel_daily)
    start = _window_start(vessel_daily)
    recent = _anomalies_in_window(anomaly_rows, latest)
    foc_price = _foc_price(vessel_daily)
    current_sl = _latest_valid_speed_loss(vessel_daily)

    candidates = [
        _hull_cleaning_action(rec, latest_uwi, latest, current_sl),
        _propeller_action(imo, uwi_rows, latest_uwi, recent, events, latest, start, foc_price, fleet_event_costs),
        _coating_action(imo, uwi_rows, latest_uwi, events, latest, start, foc_price, fleet_event_costs),
        _engine_action(imo, recent, vessel_daily, events, latest, start, foc_price, fleet_event_costs),
    ]
    return plan_maintenance([a for a in candidates if a is not None])


# --- consolidated maintenance planner -----------------------------------------


def _batch_by_due(items: list[dict], due_of) -> list[list[dict]]:
    """Greedy ``_PLAN_BATCH_DAYS`` windows over due-sorted ``items``: open a window at the
    earliest unassigned action and absorb every following action whose due date sits within
    the batch tolerance of that anchor (the anchor stays fixed for the window)."""
    windows: list[list[dict]] = []
    current: list[dict] = []
    anchor: dt.date | None = None
    for a in items:
        d = due_of(a)
        if anchor is None or (d - anchor).days > _PLAN_BATCH_DAYS:
            if current:
                windows.append(current)
            current, anchor = [a], d
        else:
            current.append(a)
    if current:
        windows.append(current)
    return windows


def plan_maintenance(actions: list[dict]) -> list[dict]:
    """Tag each action with the service window it belongs to (``plan_date`` +
    ``plan_service_type``), batching the scattered per-action due dates into a single
    "next maintenance date" per window (dry-dock-aware). Mutates and returns ``actions``.

    Greedy two-pass: (1) batch **dry_dock** actions into ``_PLAN_BATCH_DAYS`` windows,
    each anchored on — and planned for — its earliest dry-dock due (the dock is the
    constraining event, never pulled earlier); (2) fold each **in_water** action into the
    nearest dry-dock window within tolerance, else batch the leftovers among themselves
    (window planned for the earliest in-water due). A window's ``plan_service_type`` is
    ``dry_dock`` when it holds any dry-dock action, else ``in_water``.
    """
    if not actions:
        return actions

    far = dt.date.max  # a null due sorts last and never anchors a window

    def due_of(a: dict) -> dt.date:
        due = a.get('due_date')
        return periods.to_date(due) if due else far

    dry = sorted((a for a in actions if _SERVICE_CATEGORY.get(a['action_type']) == 'dry_dock'), key=due_of)
    in_water = sorted((a for a in actions if _SERVICE_CATEGORY.get(a['action_type']) != 'dry_dock'), key=due_of)

    windows = [{'anchor': due_of(batch[0]), 'actions': batch} for batch in _batch_by_due(dry, due_of)]

    unfolded: list[dict] = []
    for a in in_water:
        d = due_of(a)
        near = min(
            (w for w in windows if abs((d - w['anchor']).days) <= _PLAN_BATCH_DAYS),
            key=lambda w: abs((d - w['anchor']).days),
            default=None,
        )
        if near is not None:
            near['actions'].append(a)
        else:
            unfolded.append(a)
    windows += [{'anchor': due_of(batch[0]), 'actions': batch} for batch in _batch_by_due(unfolded, due_of)]

    for w in windows:
        acts = w['actions']
        dock = [a for a in acts if _SERVICE_CATEGORY.get(a['action_type']) == 'dry_dock']
        service_type = 'dry_dock' if dock else 'in_water'
        plan_due = min(due_of(a) for a in (dock or acts))  # dry-dock windows anchor on the dock due
        plan_date = plan_due.isoformat() if plan_due != far else None
        for a in acts:
            a['plan_date'] = plan_date
            a['plan_service_type'] = service_type
    return actions
