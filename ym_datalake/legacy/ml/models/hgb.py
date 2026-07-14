"""sklearn HistGradientBoosting quantile regressor — zero-extra-dependency challenger (§3).

Same three-quantile shape as the XGBoost champion but a different boosting
implementation (LightGBM-style histogram trees, sklearn's native-NaN splits),
so it fails differently — which is the point of a challenger.
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

from ym_datalake.ml.models.base import QUANTILES, monotone

_PARAMS = {
    'max_iter': 300,
    'learning_rate': 0.05,
    'max_depth': 5,
    'min_samples_leaf': 20,
    'l2_regularization': 1.0,
}


class HGBQuantile:
    """Three-estimator p10/p50/p90 HistGradientBoosting quantile regression."""

    model_type = 'hgb'

    def __init__(self, seed: int = 42, **overrides):
        self.seed = seed
        self.params = {**_PARAMS, **overrides}
        self._estimators: list[HistGradientBoostingRegressor] = []

    def fit(self, x: np.ndarray, y: np.ndarray) -> HGBQuantile:
        keep = np.isfinite(y)
        x, y = x[keep], y[keep]
        self._estimators = []
        for alpha in QUANTILES:
            if alpha == 0.5:  # centre = conditional mean (MSE), not the median
                reg = HistGradientBoostingRegressor(loss='squared_error', random_state=self.seed, **self.params)
            else:
                reg = HistGradientBoostingRegressor(
                    loss='quantile', quantile=alpha, random_state=self.seed, **self.params
                )
            reg.fit(x, y)
            self._estimators.append(reg)
        return self

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray:
        if not self._estimators:
            raise RuntimeError('model is not fitted')
        q = np.column_stack([reg.predict(x) for reg in self._estimators])
        return monotone(q.astype(float))

    def save(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / 'model.pkl').write_bytes(pickle.dumps(self))

    @classmethod
    def load(cls, out_dir: Path) -> HGBQuantile:
        return pickle.loads((out_dir / 'model.pkl').read_bytes())
