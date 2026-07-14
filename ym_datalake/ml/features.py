"""M7 feature engineering — causal, storage-agnostic (doc/ml-pipeline-zh.md §4).

Turns each :class:`~ym_datalake.ml.dataset.VesselSeries` into supervised
samples for **direct multi-horizon** forecasting: one row per
``(vessel, as_of, horizon)`` whose features use only data ≤ ``as_of`` (strictly
causal — no lookahead) and whose labels are the realised ``speed_loss_pct`` /
daily at-sea ``total_foc_mt`` at ``as_of + horizon``.

Scenario semantics: the forecast answers "what if **no** cleaning happens" —
that is what the maintenance optimiser needs — so training samples whose
``(as_of, target]`` window contains a hull-fouling reset are dropped (their
label reflects a post-clean recovery the scenario excludes).

The Theil-Sen level/slope of the open fouling cycle is computed **as a
feature** (``ts_level`` / ``ts_slope``): the model can use it, and the backtest
reuses the same columns as the M3-statistics baseline (§8 C21).
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass

import numpy as np

from ym_datalake.etl import trends
from ym_datalake.ml.dataset import VesselSeries

HORIZONS_TRAIN = (1, 3, 7, 14, 21, 30, 45, 60, 75, 90)
HORIZON_MAX = 90
MIN_HISTORY_DAYS = 90  # an as_of needs this much history before it may emit samples
_STALE_SL_DAYS = 14  # newest valid speed loss must be at most this old at as_of
_TS_MAX_POINTS = 150  # Theil-Sen fits at most this many trailing valid points (O(n²))

FEATURE_NAMES = [
    'horizon_days',
    'days_since_cleaning',
    'days_since_cleaning_target',
    'days_since_dry_dock',
    'sl_last',
    'sl_mean_7',
    'sl_mean_14',
    'sl_mean_30',
    'sl_std_14',
    'ts_level',
    'ts_slope',
    'slip_mean_14',
    'sfoc_mean_14',
    'adm_mean_14',
    'beaufort_mean_14',
    'wave_mean_14',
    'foc_mean_7',
    'foc_mean_30',
    'me_foc_mean_30',
    'speed_tw_mean_30',
    'laden_frac_30',
    'sea_frac_30',
    'month_sin_target',
    'month_cos_target',
    'age_years',
    'log_dwt',
    'log_mcr',
    'design_speed_kn',
]


@dataclass
class FeatureSet:
    """A feature matrix plus aligned labels and per-row provenance."""

    X: np.ndarray  # (n, len(FEATURE_NAMES))
    y_sl: np.ndarray  # (n,) speed_loss_pct at target, NaN if unlabelled
    y_foc: np.ndarray  # (n,) at-sea total_foc_mt at target, NaN if unlabelled
    meta: list[dict]  # {'imo_number', 'as_of', 'target_date', 'horizon_days'}
    feature_names: list[str]

    def column(self, name: str) -> np.ndarray:
        return self.X[:, self.feature_names.index(name)]


def _f(value) -> float:
    return float(value) if value is not None else math.nan


@dataclass
class _Arrays:
    """Per-vessel aligned numpy views of the daily history."""

    sl: np.ndarray  # valid speed_loss_pct else NaN
    slip: np.ndarray
    sfoc: np.ndarray
    adm: np.ndarray
    beaufort: np.ndarray
    wave: np.ndarray
    foc: np.ndarray  # at-sea total_foc_mt else NaN
    me_foc: np.ndarray
    speed_tw: np.ndarray
    laden: np.ndarray  # 1.0 laden / 0.0 ballast
    at_sea: np.ndarray
    dsc: np.ndarray  # days_since_cleaning
    dsd: np.ndarray  # days_since_dry_dock


def vessel_arrays(series: VesselSeries) -> _Arrays:
    n = len(series.rows)
    a = _Arrays(**{name: np.full(n, np.nan) for name in _Arrays.__dataclass_fields__})
    for i, (row, noon) in enumerate(zip(series.rows, series.noon, strict=True)):
        valid = bool(row.get('valid_flag'))
        if valid and row.get('speed_loss_pct') is not None:
            a.sl[i] = row['speed_loss_pct']
        if valid:
            a.slip[i] = _f(row.get('slip_real'))
            a.sfoc[i] = _f(row.get('sfoc_g_kwh'))
            a.adm[i] = _f(row.get('admiralty_coef'))
        a.dsc[i] = _f(row.get('days_since_cleaning'))
        a.dsd[i] = _f(row.get('days_since_dry_dock'))
        at_sea = row.get('voyage_phase') == 'at_sea'
        a.at_sea[i] = 1.0 if at_sea else 0.0
        a.laden[i] = 1.0 if row.get('condition_flag') == 'laden' else 0.0
        if noon is not None:
            a.beaufort[i] = _f(noon.get('beaufort'))
            a.wave[i] = _f(noon.get('wave_height_m'))
            if at_sea:
                a.foc[i] = _f(noon.get('total_foc_mt'))
                a.me_foc[i] = _f(noon.get('me_foc_mt'))
                a.speed_tw[i] = _f(noon.get('speed_tw_kn'))
    return a


def _tail(arr: np.ndarray, i: int, w: int) -> np.ndarray:
    return arr[max(0, i - w + 1) : i + 1]


def _nanmean(arr: np.ndarray) -> float:
    finite = arr[np.isfinite(arr)]
    return float(finite.mean()) if len(finite) else math.nan


def _nanstd(arr: np.ndarray) -> float:
    finite = arr[np.isfinite(arr)]
    return float(finite.std()) if len(finite) >= 2 else 0.0


def _last_valid(arr: np.ndarray, i: int, max_age: int) -> float:
    tail = _tail(arr, i, max_age)
    finite = np.flatnonzero(np.isfinite(tail))
    return float(tail[finite[-1]]) if len(finite) else math.nan


def _open_cycle_start(series: VesselSeries, i: int) -> int:
    """Index of the first day of the fouling cycle containing day ``i``."""
    start = 0
    for reset in series.reset_dates:
        if reset <= series.dates[i]:
            while start < i and series.dates[start] < reset:
                start += 1
        else:
            break
    return start


def _theil_sen_at(series: VesselSeries, arrs: _Arrays, i: int) -> tuple[float, float]:
    """(level at day i, slope per day) of valid speed loss over the open cycle."""
    start = _open_cycle_start(series, i)
    idx = np.flatnonzero(np.isfinite(arrs.sl[start : i + 1])) + start
    idx = idx[-_TS_MAX_POINTS:]
    if len(idx) < 3:
        level = _last_valid(arrs.sl, i, _STALE_SL_DAYS)
        return level, 0.0
    t = idx.astype(float)
    slope, intercept, _, _ = trends.robust_line(t, arrs.sl[idx])
    return slope * i + intercept, slope


def _features_at(series: VesselSeries, arrs: _Arrays, i: int, h: int, ts: tuple[float, float]) -> list[float]:
    target = series.dates[i] + dt.timedelta(days=h)
    vessel = series.vessel
    month_angle = 2.0 * math.pi * (target.month - 1) / 12.0
    ts_level, ts_slope = ts
    return [
        float(h),
        arrs.dsc[i],
        arrs.dsc[i] + h,
        arrs.dsd[i],
        _last_valid(arrs.sl, i, _STALE_SL_DAYS),
        _nanmean(_tail(arrs.sl, i, 7)),
        _nanmean(_tail(arrs.sl, i, 14)),
        _nanmean(_tail(arrs.sl, i, 30)),
        _nanstd(_tail(arrs.sl, i, 14)),
        ts_level,
        ts_slope,
        _nanmean(_tail(arrs.slip, i, 14)),
        _nanmean(_tail(arrs.sfoc, i, 14)),
        _nanmean(_tail(arrs.adm, i, 14)),
        _nanmean(_tail(arrs.beaufort, i, 14)),
        _nanmean(_tail(arrs.wave, i, 14)),
        _nanmean(_tail(arrs.foc, i, 7)),
        _nanmean(_tail(arrs.foc, i, 30)),
        _nanmean(_tail(arrs.me_foc, i, 30)),
        _nanmean(_tail(arrs.speed_tw, i, 30)),
        _nanmean(_tail(arrs.laden, i, 30)),
        _nanmean(_tail(arrs.at_sea, i, 30)),
        math.sin(month_angle),
        math.cos(month_angle),
        float(series.dates[i].year - vessel.get('build_year', series.dates[i].year)),
        math.log(vessel.get('dwt') or 1.0),
        math.log(vessel.get('mcr_kw') or 1.0),
        _f(vessel.get('design_speed_kn')),
    ]


def _reset_within(series: VesselSeries, i: int, h: int) -> bool:
    lo, hi = series.dates[i], series.dates[i] + dt.timedelta(days=h)
    return any(lo < r <= hi for r in series.reset_dates)


def build_training_set(
    series_list: list[VesselSeries],
    horizons: tuple[int, ...] = HORIZONS_TRAIN,
    stride: int = 7,
) -> FeatureSet:
    """Supervised samples across the fleet: strided as_of dates × horizons."""
    rows, y_sl, y_foc, meta = [], [], [], []
    for series in series_list:
        arrs = vessel_arrays(series)
        n = len(series.rows)
        for i in range(MIN_HISTORY_DAYS, n, stride):
            if not math.isfinite(_last_valid(arrs.sl, i, _STALE_SL_DAYS)):
                continue
            ts = _theil_sen_at(series, arrs, i)
            for h in horizons:
                j = i + h
                if j >= n or _reset_within(series, i, h):
                    continue
                label_sl = arrs.sl[j]
                label_foc = arrs.foc[j]
                if not (math.isfinite(label_sl) or math.isfinite(label_foc)):
                    continue
                rows.append(_features_at(series, arrs, i, h, ts))
                y_sl.append(label_sl)
                y_foc.append(label_foc)
                meta.append(
                    {
                        'imo_number': series.imo_number,
                        'as_of': series.dates[i],
                        'target_date': series.dates[j],
                        'horizon_days': h,
                    }
                )
    x = np.array(rows) if rows else np.empty((0, len(FEATURE_NAMES)))
    return FeatureSet(x, np.array(y_sl), np.array(y_foc), meta, list(FEATURE_NAMES))


def build_inference_set(series: VesselSeries, horizon_max: int = HORIZON_MAX) -> FeatureSet:
    """Features at the vessel's **latest** day for every horizon 1..``horizon_max``."""
    arrs = vessel_arrays(series)
    i = len(series.rows) - 1
    ts = _theil_sen_at(series, arrs, i)
    rows, meta = [], []
    for h in range(1, horizon_max + 1):
        rows.append(_features_at(series, arrs, i, h, ts))
        meta.append(
            {
                'imo_number': series.imo_number,
                'as_of': series.dates[i],
                'target_date': series.dates[i] + dt.timedelta(days=h),
                'horizon_days': h,
            }
        )
    x = np.array(rows)
    nan = np.full(len(rows), np.nan)
    return FeatureSet(x, nan, nan.copy(), meta, list(FEATURE_NAMES))
