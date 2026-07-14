"""Unified model interface — every M7 architecture plugs in here (§3, §5).

A regressor is anything with ``fit`` / ``predict_quantiles`` / ``save`` /
``load``. ``predict_quantiles`` returns an ``(n, 3)`` array of **p10 / p50 /
p90**, already monotone per row. Adding a challenger (e.g. the PyTorch GRU)
means implementing this protocol and registering it in ``MODEL_TYPES``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable

import numpy as np

QUANTILES = (0.1, 0.5, 0.9)


@runtime_checkable
class QuantileRegressor(Protocol):
    """p10/p50/p90 quantile regressor over a fixed feature matrix."""

    model_type: str

    def fit(self, x: np.ndarray, y: np.ndarray) -> QuantileRegressor: ...

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray: ...

    def save(self, out_dir: Path) -> None: ...


def monotone(q: np.ndarray) -> np.ndarray:
    """Sort each row so p10 ≤ p50 ≤ p90 (quantile crossing guard)."""
    return np.sort(q, axis=1)


class Scaler:
    """Median imputation + optional standardisation for NaN-intolerant models.

    Trees (xgboost / hgb) split on NaN natively; anything else (linear, torch,
    random forest) goes through this. Parameters are fitted on the training
    matrix and stored with the model artifact.
    """

    def __init__(self, standardize: bool = True):
        self.standardize = standardize
        self.median: np.ndarray | None = None
        self.mean: np.ndarray | None = None
        self.std: np.ndarray | None = None

    def fit(self, x: np.ndarray) -> Scaler:
        median = np.nanmedian(x, axis=0)
        self.median = np.where(np.isfinite(median), median, 0.0)
        filled = np.where(np.isfinite(x), x, self.median)
        self.mean = filled.mean(axis=0)
        std = filled.std(axis=0)
        self.std = np.where(std > 1e-9, std, 1.0)
        return self

    def transform(self, x: np.ndarray) -> np.ndarray:
        x = np.where(np.isfinite(x), x, self.median)
        if self.standardize:
            x = (x - self.mean) / self.std
        return x
