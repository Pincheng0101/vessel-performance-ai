"""Rolling-origin backtest + champion gate (doc/ml-pipeline-zh.md §4.3, §8 C21).

Six monthly origins near the data end. For each origin the model trains only on
samples whose **target** precedes the origin (no leakage through labels) and is
scored on samples whose as_of falls in the following 30 days. **RMSE** is
reported per horizon bucket (h≤7 / ≤30 / ≤90) — the centre prediction trains
on squared loss (conditional mean), so it is scored on the matching metric —
against the naive baselines the champion must beat:

- ``speed_loss`` — persistence (``sl_last``) and the M3 Theil-Sen extrapolation
  (``ts_level + ts_slope·h``), both read from the causal feature columns;
- ``foc`` — the trailing 7-day and 30-day at-sea means.

Gate: champion RMSE ≤ 1.05 × best baseline in **every** bucket, and strictly ≤
in at least two — otherwise C21 fails and the statistics stay in charge.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

import numpy as np

from ym_datalake.ml.features import FeatureSet

N_FOLDS = 6
_FOLD_STEP_DAYS = 30
_EVAL_WINDOW_DAYS = 30
_BUCKETS = ((1, 7, 'h7'), (8, 30, 'h30'), (31, 90, 'h90'))
_GATE_SLACK = 1.05


@dataclass
class BacktestReport:
    """Per-bucket RMSE for the model and each baseline, pooled over folds."""

    target: str
    n_folds: int
    rmse: dict[str, float] = field(default_factory=dict)  # bucket -> model centre-prediction RMSE
    baseline_rmse: dict[str, dict[str, float]] = field(default_factory=dict)  # bucket -> {name: RMSE}
    coverage: dict[str, float] = field(default_factory=dict)  # bucket -> P(y ∈ [p10, p90])
    n: dict[str, int] = field(default_factory=dict)  # bucket -> pooled eval samples

    def best_baseline(self, bucket: str) -> float:
        return min(self.baseline_rmse[bucket].values())

    def mean_rmse(self) -> float:
        """Equal-weight mean RMSE over the populated buckets (champion-race score)."""
        buckets = [b for b in self.rmse if self.n.get(b, 0) > 0]
        return float(np.mean([self.rmse[b] for b in buckets])) if buckets else float('inf')

    def passes_gate(self) -> bool:
        buckets = [b for b in self.rmse if self.n.get(b, 0) > 0]
        if not buckets:
            return False
        within = all(self.rmse[b] <= self.best_baseline(b) * _GATE_SLACK for b in buckets)
        strict = sum(self.rmse[b] <= self.best_baseline(b) for b in buckets)
        return within and strict >= min(2, len(buckets))

    def summary_lines(self) -> list[str]:
        lines = []
        for _, _, bucket in _BUCKETS:
            if not self.n.get(bucket):
                continue
            base = ' '.join(f'{k}={v:.3f}' for k, v in sorted(self.baseline_rmse[bucket].items()))
            lines.append(
                f'{self.target:<10} {bucket:<4} n={self.n[bucket]:<5} '
                f'model={self.rmse[bucket]:.3f}  {base}  cover80={self.coverage[bucket]:.2f}'
            )
        return lines


def _baselines(fs: FeatureSet, target: str, idx: np.ndarray) -> dict[str, np.ndarray]:
    h = fs.column('horizon_days')[idx]
    if target == 'speed_loss':
        return {
            'persist': fs.column('sl_last')[idx],
            'theilsen': fs.column('ts_level')[idx] + fs.column('ts_slope')[idx] * h,
        }
    return {'mean7': fs.column('foc_mean_7')[idx], 'mean30': fs.column('foc_mean_30')[idx]}


def run_backtest(fs: FeatureSet, target: str, model_factory, n_folds: int = N_FOLDS) -> BacktestReport:
    """Rolling-origin evaluation of ``model_factory()`` on ``fs`` for one target."""
    y = fs.y_sl if target == 'speed_loss' else fs.y_foc
    labelled = np.isfinite(y)
    as_of = np.array([m['as_of'].toordinal() for m in fs.meta])
    target_day = np.array([m['target_date'].toordinal() for m in fs.meta])
    horizon = fs.column('horizon_days')
    data_end = int(target_day.max())

    sq_err: dict[str, list[np.ndarray]] = {}
    inside: dict[str, list[np.ndarray]] = {}

    report = BacktestReport(target=target, n_folds=n_folds)
    for k in range(n_folds):
        origin = data_end - (90 + _EVAL_WINDOW_DAYS) - _FOLD_STEP_DAYS * k
        train = labelled & (target_day <= origin)
        eval_ = labelled & (as_of > origin) & (as_of <= origin + _EVAL_WINDOW_DAYS)
        if train.sum() < 100 or not eval_.sum():
            continue
        model = model_factory()
        model.fit(fs.X[train], y[train])
        q = model.predict_quantiles(fs.X[eval_])
        idx = np.flatnonzero(eval_)
        base_preds = _baselines(fs, target, idx)
        for lo, hi, bucket in _BUCKETS:
            in_bucket = (horizon[idx] >= lo) & (horizon[idx] <= hi)
            if not in_bucket.any():
                continue
            y_true = y[idx][in_bucket]
            sq_err.setdefault(bucket, []).append((q[in_bucket, 1] - y_true) ** 2)
            inside.setdefault(bucket, []).append((y_true >= q[in_bucket, 0]) & (y_true <= q[in_bucket, 2]))
            for name, pred in base_preds.items():
                sq_err.setdefault(f'{bucket}:{name}', []).append((pred[in_bucket] - y_true) ** 2)

    for _, _, bucket in _BUCKETS:
        if bucket not in sq_err:
            continue
        errs = np.concatenate(sq_err[bucket])
        report.rmse[bucket] = float(np.sqrt(errs.mean()))
        report.n[bucket] = len(errs)
        report.coverage[bucket] = float(np.concatenate(inside[bucket]).mean())
        report.baseline_rmse[bucket] = {
            key.split(':', 1)[1]: float(np.sqrt(np.concatenate(v).mean()))
            for key, v in sq_err.items()
            if key.startswith(f'{bucket}:')
        }
    return report


def fold_origins(fs: FeatureSet, n_folds: int = N_FOLDS) -> list[dt.date]:
    """The origin dates ``run_backtest`` uses (exposed for reporting/tests)."""
    data_end = max(m['target_date'] for m in fs.meta)
    return [data_end - dt.timedelta(days=(90 + _EVAL_WINDOW_DAYS) + _FOLD_STEP_DAYS * k) for k in range(n_folds)]
