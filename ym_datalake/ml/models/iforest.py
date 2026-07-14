"""Isolation-forest fleet health score (doc/ml-pipeline-zh.md §3).

Complements the M3 point-anomaly detector with a single **0–1 health index**
per vessel: 1 ≈ typical fleet behaviour, → 0 as the vessel's recent
multivariate state (speed loss, real slip, SFOC, admiralty coefficient) drifts
into the fleet's anomaly tail. Channels are per-vessel robust-z scaled
(median/MAD from that vessel's own history) so hull size drops out and one
pooled forest serves the whole fleet — including vessels unseen at fit time
(their scaling comes from their own history at score time).

The score is a standalone output on ``fact_ml_prediction`` (repeated per-vessel
like ``fact_speed_profile``'s vessel-level columns), not an XGB input feature —
keeping it out of the feature matrix avoids backtest leakage gymnastics.
"""

from __future__ import annotations

import math

import numpy as np
from sklearn.ensemble import IsolationForest

from ym_datalake.ml import features as ft
from ym_datalake.ml.dataset import VesselSeries

_CHANNELS = ('sl', 'slip', 'sfoc', 'adm')
_WINDOW_DAYS = 14  # the vessel-level score averages this many trailing daily scores


def _robust_params(x: np.ndarray) -> tuple[float, float]:
    finite = x[np.isfinite(x)]
    if not len(finite):
        return 0.0, 1.0
    med = float(np.median(finite))
    mad = float(np.median(np.abs(finite - med)))
    return med, (1.4826 * mad) or float(finite.std()) or 1.0


def _channel_matrix(arrs: ft._Arrays, params: dict[str, tuple[float, float]]) -> np.ndarray:
    cols = []
    for name in _CHANNELS:
        med, scale = params[name]
        cols.append((getattr(arrs, name) - med) / scale)
    return np.column_stack(cols)


class HealthScorer:
    """Pooled fleet IsolationForest over per-vessel robust-z daily channels."""

    model_type = 'iforest'

    def __init__(self, seed: int = 42, n_estimators: int = 200):
        self.seed = seed
        self.n_estimators = n_estimators
        self._forest: IsolationForest | None = None
        self._train_scores: np.ndarray | None = None

    def _vessel_params(self, arrs: ft._Arrays) -> dict[str, tuple[float, float]]:
        return {name: _robust_params(getattr(arrs, name)) for name in _CHANNELS}

    def fit(self, series_list: list[VesselSeries]) -> HealthScorer:
        blocks = []
        for series in series_list:
            arrs = ft.vessel_arrays(series)
            z = _channel_matrix(arrs, self._vessel_params(arrs))
            blocks.append(z[np.isfinite(z).all(axis=1)])
        pooled = np.vstack(blocks)
        self._forest = IsolationForest(n_estimators=self.n_estimators, random_state=self.seed)
        self._forest.fit(pooled)
        self._train_scores = np.sort(self._forest.score_samples(pooled))
        return self

    def daily_scores(self, series: VesselSeries) -> np.ndarray:
        """Per-day health in [0, 1] (NaN on days without all four channels)."""
        if self._forest is None or self._train_scores is None:
            raise RuntimeError('scorer is not fitted')
        arrs = ft.vessel_arrays(series)
        z = _channel_matrix(arrs, self._vessel_params(arrs))
        ok = np.isfinite(z).all(axis=1)
        out = np.full(len(z), np.nan)
        if ok.any():
            raw = self._forest.score_samples(z[ok])
            # health = fleet-percentile rank of the day's anomaly score
            out[ok] = np.searchsorted(self._train_scores, raw) / len(self._train_scores)
        return out

    def health_at_end(self, series: VesselSeries) -> float | None:
        """Mean health over the vessel's last ``_WINDOW_DAYS`` scored days."""
        scores = self.daily_scores(series)[-_WINDOW_DAYS:]
        finite = scores[np.isfinite(scores)]
        return float(finite.mean()) if len(finite) else None


def health_or_none(value: float | None) -> float | None:
    return None if value is None or math.isnan(value) else value
