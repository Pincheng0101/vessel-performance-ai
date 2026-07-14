"""XGBoost regressor — MSE centre + pinball p10/p90 band (§3).

Three boosters: the centre one trains on squared loss (conditional **mean**,
the published point prediction), the outer two on ``reg:quantileerror``
pinball loss (the internal p10/p90 band feeding the maintenance date range).
Deterministic (`hist` tree method, single thread, fixed seed). NaN features
are fine — trees route missing values natively, which is also why this is the
architecture that survives real noon-report data with holes.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import xgboost as xgb

from ym_datalake.ml.models.base import QUANTILES, monotone

_PARAMS = {
    'n_estimators': 300,
    'learning_rate': 0.05,
    'max_depth': 5,
    'min_child_weight': 5.0,
    'subsample': 0.9,
    'colsample_bytree': 0.9,
    'tree_method': 'hist',
    'n_jobs': 1,
}


class XGBQuantile:
    """Three-booster p10/p50/p90 XGBoost quantile regression."""

    model_type = 'xgboost'

    def __init__(self, seed: int = 42, **overrides):
        self.seed = seed
        self.params = {**_PARAMS, **overrides}
        self._boosters: list[xgb.XGBRegressor] = []

    def fit(self, x: np.ndarray, y: np.ndarray) -> XGBQuantile:
        keep = np.isfinite(y)
        x, y = x[keep], y[keep]
        self._boosters = []
        for alpha in QUANTILES:
            if alpha == 0.5:  # centre = conditional mean (MSE), not the median
                reg = xgb.XGBRegressor(objective='reg:squarederror', random_state=self.seed, **self.params)
            else:
                reg = xgb.XGBRegressor(
                    objective='reg:quantileerror',
                    quantile_alpha=alpha,
                    random_state=self.seed,
                    **self.params,
                )
            reg.fit(x, y)
            self._boosters.append(reg)
        return self

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray:
        if not self._boosters:
            raise RuntimeError('model is not fitted')
        q = np.column_stack([reg.predict(x) for reg in self._boosters])
        return monotone(q.astype(float))

    def save(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        for alpha, reg in zip(QUANTILES, self._boosters, strict=True):
            reg.save_model(out_dir / f'booster_q{int(alpha * 100)}.json')
        (out_dir / 'params.json').write_text(json.dumps({'seed': self.seed, 'params': self.params}))

    @classmethod
    def load(cls, out_dir: Path) -> XGBQuantile:
        spec = json.loads((out_dir / 'params.json').read_text())
        model = cls(seed=spec['seed'], **spec['params'])
        for alpha in QUANTILES:
            reg = xgb.XGBRegressor()
            reg.load_model(out_dir / f'booster_q{int(alpha * 100)}.json')
            model._boosters.append(reg)
        return model
