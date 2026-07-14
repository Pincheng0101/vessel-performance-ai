"""§5.1 performance trend, fouling rate and per-cycle baselines (M3).

Robust (Theil-Sen) piecewise regression of ``speed_loss_pct`` vs
``days_since_cleaning``, split at hull-fouling resets → the per-cycle slope
(**fouling rate**, %/day), its bootstrap 95 % CI, and the residual baselines the
anomaly detector (§5.2) flags observations against. ``extrapolate`` projects the
open cycle forward to a target speed loss for the maintenance recommendation
(§5.5). Fits use ``valid_flag`` points only; detection then runs against the
broader metric-bearing set (see ``anomaly``).
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import numpy as np

from ym_datalake.etl import periods

_BOOTSTRAP = 100  # seeded resamples for the slope 95 % CI


@dataclass
class Segment:
    """One fouling cycle's robust trend of speed loss vs days-since-cleaning."""

    start: dt.date
    end: dt.date
    slope: float  # %/day (fouling rate)
    intercept: float
    ci_lo: float
    ci_hi: float
    n: int  # valid points fitted
    open_cycle: bool  # the current, still-open cycle (extends to the data end)


def _theil_sen(t: np.ndarray, y: np.ndarray) -> float:
    """Median of pairwise slopes over distinct abscissae (O(n²), n ≤ ~600)."""
    dt_ = t[None, :] - t[:, None]
    mask = dt_ > 0
    if not mask.any():
        return 0.0
    slopes = (y[None, :] - y[:, None])[mask] / dt_[mask]
    return float(np.median(slopes))


def _bootstrap_ci(t: np.ndarray, y: np.ndarray, rng: np.random.Generator) -> tuple[float, float]:
    n = len(t)
    if n < 5:
        s = _theil_sen(t, y)
        return s, s
    slopes = np.empty(_BOOTSTRAP)
    for b in range(_BOOTSTRAP):
        idx = rng.integers(0, n, n)
        slopes[b] = _theil_sen(t[idx], y[idx])
    lo, hi = np.percentile(slopes, [2.5, 97.5])
    return float(lo), float(hi)


def robust_line(t, y, rng: np.random.Generator | None = None) -> tuple[float, float, float, float]:
    """Theil-Sen ``(slope, intercept, ci_lo, ci_hi)``; CI = slope unless ``rng`` given."""
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    n = len(t)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0
    if n == 1:
        return 0.0, float(y[0]), 0.0, 0.0
    slope = _theil_sen(t, y)
    intercept = float(np.median(y - slope * t))
    ci_lo, ci_hi = _bootstrap_ci(t, y, rng) if rng is not None else (slope, slope)
    return slope, intercept, ci_lo, ci_hi


def _window_bounds(vessel_daily: list[dict], resets: list[dt.date]) -> list[dt.date]:
    dates = [periods.to_date(r['report_date']) for r in vessel_daily]
    window_start, window_end = min(dates), max(dates) + dt.timedelta(days=1)
    interior = [r for r in sorted(resets) if window_start < r < window_end]
    return [window_start, *interior, window_end]


def fit_segments(
    vessel_daily: list[dict], resets: list[dt.date], rng: np.random.Generator | None = None
) -> list[Segment]:
    """Piecewise robust fit of speed loss vs days-since-cleaning, split at resets.

    Only the open (last) cycle gets a bootstrap CI — the others' CIs are unused
    and the resample is the expensive part.
    """
    bounds = _window_bounds(vessel_daily, resets)
    valid = [
        (periods.to_date(r['report_date']), r['days_since_cleaning'], r['speed_loss_pct'])
        for r in vessel_daily
        if r['valid_flag'] and r['speed_loss_pct'] is not None
    ]
    segments: list[Segment] = []
    last = len(bounds) - 2
    for i, (start, end) in enumerate(zip(bounds, bounds[1:])):
        pts = [(dsc, sl) for d, dsc, sl in valid if start <= d < end]
        t = np.array([p[0] for p in pts], dtype=float)
        y = np.array([p[1] for p in pts], dtype=float)
        slope, intercept, lo, hi = robust_line(t, y, rng if i == last else None)
        segments.append(Segment(start, end, slope, intercept, lo, hi, len(pts), i == last))
    return segments


def _segment_index(segments: list[Segment], d: dt.date) -> int:
    for i, seg in enumerate(segments):
        if seg.start <= d < seg.end:
            return i
    return len(segments) - 1


def _segment_median(vessel_daily: list[dict], seg: Segment, field: str) -> float | None:
    vals = [
        r[field]
        for r in vessel_daily
        if r['valid_flag'] and r.get(field) is not None and seg.start <= periods.to_date(r['report_date']) < seg.end
    ]
    return float(np.median(vals)) if vals else None


def baseline_series(
    vessel_daily: list[dict], segments: list[Segment], curve_n: float, me_foc_by_date: dict[str, float]
) -> dict[str, dict]:
    """``report_date -> {speed_loss, sfoc, slip, excess_foc}`` expected-from-trend.

    speed_loss follows the segment line; sfoc/slip are flat per-cycle robust
    medians; excess_foc is the fuel a clean-trend hull would burn at the expected
    speed loss (``me_foc·[1−(1−s_exp)^n]``, spec §5.2).
    """
    seg_sfoc = [_segment_median(vessel_daily, seg, 'sfoc_g_kwh') for seg in segments]
    seg_slip = [_segment_median(vessel_daily, seg, 'slip_real') for seg in segments]
    out: dict[str, dict] = {}
    for r in vessel_daily:
        if r['speed_loss_pct'] is None:
            continue
        si = _segment_index(segments, periods.to_date(r['report_date']))
        seg = segments[si]
        base_sl = seg.slope * r['days_since_cleaning'] + seg.intercept
        s_exp = max(0.0, base_sl / 100.0)
        me_foc = me_foc_by_date.get(r['report_date'])
        base_efoc = me_foc * (1.0 - (1.0 - s_exp) ** curve_n) if me_foc is not None else None
        out[r['report_date']] = {
            'speed_loss': base_sl,
            'sfoc': seg_sfoc[si],
            'slip': seg_slip[si],
            'excess_foc': base_efoc,
        }
    return out


def extrapolate(segment: Segment, target_pct: float, last_cleaning: dt.date) -> str | None:
    """Date the open-cycle line reaches ``target_pct`` speed loss (None if slope ≤ 0)."""
    if segment.slope <= 0.0:
        return None
    dsc = (target_pct - segment.intercept) / segment.slope
    return (last_cleaning + dt.timedelta(days=round(max(0.0, dsc)))).isoformat()
