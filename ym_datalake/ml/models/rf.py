"""Random-forest quantile regressor — bagging challenger (§3).

One RandomForestRegressor; the p10/p50/p90 come from the **per-tree prediction
distribution** (a simplified quantile regression forest): each tree sees a
different bootstrap sample, so the spread across trees approximates the
conditional distribution. Cheaper than fitting three forests and gives the
race a non-boosting tree architecture. NaNs go through the shared median
imputer (sklearn forests reject NaN).
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestRegressor

from ym_datalake.ml.models.base import QUANTILES, Scaler, monotone

_PARAMS = {
    'n_estimators': 300,
    'min_samples_leaf': 5,
    'max_features': 0.7,
    'n_jobs': 1,
}


class RFQuantile:
    """Per-tree-percentile p10/p50/p90 random forest."""

    model_type = 'random_forest'

    def __init__(self, seed: int = 42, **overrides):
        self.seed = seed
        self.params = {**_PARAMS, **overrides}
        self._forest: RandomForestRegressor | None = None
        self._scaler = Scaler(standardize=False)  # trees are scale-free; impute only

    def fit(self, x: np.ndarray, y: np.ndarray) -> RFQuantile:
        keep = np.isfinite(y)
        x, y = x[keep], y[keep]
        self._scaler.fit(x)
        self._forest = RandomForestRegressor(random_state=self.seed, **self.params)
        self._forest.fit(self._scaler.transform(x), y)
        return self

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray:
        if self._forest is None:
            raise RuntimeError('model is not fitted')
        xt = self._scaler.transform(x)
        per_tree = np.stack([tree.predict(xt) for tree in self._forest.estimators_])  # (trees, n)
        q = np.percentile(per_tree, [a * 100 for a in QUANTILES], axis=0).T  # (n, 3)
        q[:, 1] = per_tree.mean(axis=0)  # centre = ensemble mean (the MSE-optimal point), band from tree percentiles
        return monotone(q.astype(float))

    def save(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / 'model.pkl').write_bytes(pickle.dumps(self))

    @classmethod
    def load(cls, out_dir: Path) -> RFQuantile:
        return pickle.loads((out_dir / 'model.pkl').read_bytes())
