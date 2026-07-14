"""G3 — maintenance-timing optimisation on the *predicted* fouling curve (§6.2).

M3's closed form ``T* = √(2K/β)`` assumes a linear excess-cost ramp. Here the
cycle cost rate is minimised **numerically** over the ML fouling forecast
instead, on the **same days-since-cleaning clock M3 uses**:

    J(τ) = (K + C_past + Σ_{τ0<u≤τ} ĉ(u)) / τ        τ = cycle age at cleaning

where ``τ0`` is the cycle age at ``as_of`` (curated ``days_since_cleaning``),
``C_past`` the excess cost already accumulated this cycle (curated
``cum_excess_cost_usd``), and ``ĉ`` the predicted daily excess-cost curve —
the p50 speed-loss forecast converted via the vessel's recent implied
economics (median ME fuel burn, implied bunker price, implied reference-curve
exponent — all recovered from curated columns, no ground truth) and
extrapolated past the 90-day forecast horizon. Anchoring J on the full cycle
keeps the amortisation honest when the trigger is imminent (a "clean
tomorrow" candidate divides by the whole cycle age, not by one day). The
p10/p90 curves give an uncertainty band on the date;
``fact_recommendation``'s closed-form date rides along as the comparison
column.
"""

from __future__ import annotations

import datetime as dt
import math

import numpy as np

from ym_datalake.etl.periods import MT_TRIGGER_PCT
from ym_datalake.ml.dataset import VesselSeries

PLAN_DAYS = 730  # J(T) sweep horizon
_EXTRAP_TAIL = 30  # forecast tail points that set the extrapolation slope
_ECON_WINDOW = 90  # trailing days used to imply price / exponent / fuel burn
_FALLBACK_PRICE = 600.0  # USD/mt when no excess-cost days exist (mirrors etl.recommendation)
_FALLBACK_N = 3.0  # cube-law exponent when the implied exponent is unrecoverable
_FALLBACK_CLEAN_COST = 100_000.0  # USD when the fleet has no hull_cleaning history
_DOWNTIME_USD_PER_HR = 1000.0  # same POC downtime rate as etl.recommendation
_SL_CAP_PCT = 30.0  # extrapolated speed loss is clipped to a physical band


def implied_economics(series: VesselSeries) -> dict:
    """Recover the ĉ(t) conversion constants from the vessel's recent history."""
    rows = series.rows[-_ECON_WINDOW:]
    noon = series.noon[-_ECON_WINDOW:]
    prices, exponents, me_focs, at_sea = [], [], [], 0
    for row, nr in zip(rows, noon, strict=True):
        if row.get('voyage_phase') != 'at_sea':
            continue
        at_sea += 1
        excess_foc, excess_cost = row.get('excess_foc_mt'), row.get('excess_cost_usd')
        sl = row.get('speed_loss_pct')
        me_foc = (nr or {}).get('me_foc_mt')
        if me_foc:
            me_focs.append(me_foc)
        if excess_foc and excess_cost and excess_foc > 0:
            prices.append(excess_cost / excess_foc)
        if me_foc and excess_foc and sl and 0 < sl < 100 and 0 < excess_foc < me_foc:
            exponents.append(math.log(1.0 - excess_foc / me_foc) / math.log(1.0 - sl / 100.0))
    return {
        'price_usd_per_mt': float(np.median(prices)) if prices else _FALLBACK_PRICE,
        'curve_n': float(np.clip(np.median(exponents), 1.5, 6.0)) if exponents else _FALLBACK_N,
        'me_foc_mt': float(np.median(me_focs)) if me_focs else 0.0,
        'sea_frac': at_sea / max(1, len(rows)),
    }


def cleaning_cost(maintenance_events: list[dict], imo: str) -> float:
    """Median full hull-cleaning cost (cash + downtime) — vessel, else fleet, else fallback."""

    def costs(rows):
        return [
            r['cost_usd'] + r.get('downtime_hours', 0.0) * _DOWNTIME_USD_PER_HR
            for r in rows
            if r['event_type'] == 'hull_cleaning'
        ]

    own = costs([e for e in maintenance_events if e['imo_number'] == imo])
    pool = own or costs(maintenance_events)
    return float(np.median(pool)) if pool else _FALLBACK_CLEAN_COST


def extend_curve(pred_sl_pct: np.ndarray, days_total: int = PLAN_DAYS) -> np.ndarray:
    """Extend a 90-day speed-loss forecast to ``days_total`` by its tail slope."""
    n = len(pred_sl_pct)
    if n >= days_total:
        return np.clip(pred_sl_pct[:days_total], 0.0, _SL_CAP_PCT)
    tail = pred_sl_pct[-min(_EXTRAP_TAIL, n) :]
    slope = float(np.polyfit(np.arange(len(tail)), tail, 1)[0]) if len(tail) >= 2 else 0.0
    slope = max(slope, 0.0)  # a cleaning-free scenario never un-fouls
    extra = pred_sl_pct[-1] + slope * np.arange(1, days_total - n + 1)
    return np.clip(np.concatenate([pred_sl_pct, extra]), 0.0, _SL_CAP_PCT)


def daily_excess_cost(sl_pct: np.ndarray, econ: dict) -> np.ndarray:
    """ĉ(t): excess fuel cost/day implied by a speed-loss curve (USD)."""
    s = np.clip(sl_pct / 100.0, 0.0, 0.99)
    excess_foc = econ['me_foc_mt'] * (1.0 - (1.0 - s) ** econ['curve_n'])
    return excess_foc * econ['price_usd_per_mt'] * econ['sea_frac']


def _argmin_j(cost_curve: np.ndarray, clean_cost: float, cycle_age: int, past_cost: float) -> tuple[int, np.ndarray]:
    """Minimise J over cleaning ``tf`` days from now; J is per cycle-age day (τ = cycle_age + tf)."""
    tau = cycle_age + np.arange(1, len(cost_curve) + 1, dtype=float)
    j = (clean_cost + past_cost + np.cumsum(cost_curve)) / tau
    t_star = int(np.argmin(j)) + 1
    return t_star, j


def _cycle_state(series: VesselSeries) -> tuple[int, float]:
    """(cycle age τ0 at as_of, excess cost already accumulated this cycle)."""
    last = series.rows[-1]
    cycle_age = int(last.get('days_since_cleaning') or 0)
    cycle_start = series.dates[-1] - dt.timedelta(days=cycle_age)
    for row, day in zip(reversed(series.rows), reversed(series.dates), strict=True):
        if day < cycle_start:
            break
        cum = row.get('cum_excess_cost_usd')
        if cum is not None:
            return cycle_age, float(cum)
    return cycle_age, 0.0


def trigger_eta(sl_curve: np.ndarray, as_of: dt.date) -> str | None:
    """First date the extended p50 speed loss crosses the 8 % maintenance trigger."""
    crossing = np.flatnonzero(sl_curve >= MT_TRIGGER_PCT)
    return (as_of + dt.timedelta(days=int(crossing[0]) + 1)).isoformat() if len(crossing) else None


def build_plan(
    series: VesselSeries,
    quantile_curves: dict[str, np.ndarray],  # {'p10'|'p50'|'p90': 90-day speed-loss forecast}
    maintenance_events: list[dict],
    baseline_clean_date: str | None,
    model_id: str,
) -> dict:
    """One ``fact_ml_maintenance_plan`` row for a vessel."""
    as_of = series.dates[-1]
    econ = implied_economics(series)
    clean_cost = cleaning_cost(maintenance_events, series.imo_number)
    cycle_age, past_cost = _cycle_state(series)

    extended = {q: extend_curve(curve) for q, curve in quantile_curves.items()}
    t_star: dict[str, int] = {}
    j_curves: dict[str, np.ndarray] = {}
    for q, sl_curve in extended.items():
        t_star[q], j_curves[q] = _argmin_j(daily_excess_cost(sl_curve, econ), clean_cost, cycle_age, past_cost)

    # p90 = worse fouling → clean earlier; sort so early ≤ recommended ≤ late regardless
    days_early, days_rec, days_late = sorted((t_star['p90'], t_star['p50'], t_star['p10']))
    eta = trigger_eta(extended['p50'], as_of)
    j50 = j_curves['p50']
    t_ref = (dt.date.fromisoformat(eta) - as_of).days if eta else len(j50)
    t_ref = min(max(t_ref, 1), len(j50))
    saving = max(0.0, (j50[t_ref - 1] - j50[days_rec - 1]) * 365.0)

    return {
        'imo_number': series.imo_number,
        'as_of_date': as_of.isoformat(),
        'recommended_clean_date': (as_of + dt.timedelta(days=days_rec)).isoformat(),
        'recommended_date_early': (as_of + dt.timedelta(days=days_early)).isoformat(),
        'recommended_date_late': (as_of + dt.timedelta(days=days_late)).isoformat(),
        'trigger_eta_pred': eta,
        'expected_saving_usd': saving,
        'clean_cost_usd': clean_cost,
        'baseline_clean_date': baseline_clean_date,
        'model_id': model_id,
    }


def curves_from_predictions(pred_rows: list[dict]) -> dict[str, np.ndarray]:
    """Per-vessel point (p50) speed-loss curves from ``fact_ml_prediction`` rows (for C23)."""
    by_imo: dict[str, list[dict]] = {}
    for row in pred_rows:
        by_imo.setdefault(row['imo_number'], []).append(row)
    out = {}
    for imo, rows in by_imo.items():
        rows = sorted(rows, key=lambda r: r['horizon_days'])
        out[imo] = np.array([r['speed_loss_pct_pred'] for r in rows], dtype=float)
    return out
