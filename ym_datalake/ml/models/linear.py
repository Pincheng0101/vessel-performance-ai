"""Linear quantile regression — the interpretable floor of the race (§3).

Three sklearn ``QuantileRegressor``s (pinball loss, L1-regularised, ``highs``
LP solver) on median-imputed, standardised features. A linear model can't
capture interactions, so it doubles as a sanity bar: any tree/net that can't
beat it isn't earning its complexity. Coefficients are directly readable
(``coefficients()``) — useful when explaining the model to the fleet team.
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.linear_model import LinearRegression, QuantileRegressor

from ym_datalake.ml.models.base import QUANTILES, Scaler, monotone

_ALPHA = 1e-4  # light L1 so collinear features don't blow up the LP


class LinearQuantile:
    """Three-estimator p10/p50/p90 linear quantile regression."""

    model_type = 'linear'

    def __init__(self, seed: int = 42, alpha: float = _ALPHA):
        self.seed = seed  # unused (LP solve is deterministic) but keeps the shared signature
        self.alpha = alpha
        self._estimators: list[QuantileRegressor] = []
        self._scaler = Scaler(standardize=True)

    def fit(self, x: np.ndarray, y: np.ndarray) -> LinearQuantile:
        keep = np.isfinite(y)
        x, y = x[keep], y[keep]
        self._scaler.fit(x)
        xt = self._scaler.transform(x)
        self._estimators = []
        for alpha_q in QUANTILES:
            if alpha_q == 0.5:  # centre = OLS conditional mean (MSE), not the median
                reg = LinearRegression()
            else:
                reg = QuantileRegressor(quantile=alpha_q, alpha=self.alpha, solver='highs')
            reg.fit(xt, y)
            self._estimators.append(reg)
        return self

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray:
        if not self._estimators:
            raise RuntimeError('model is not fitted')
        xt = self._scaler.transform(x)
        q = np.column_stack([reg.predict(xt) for reg in self._estimators])
        return monotone(q.astype(float))

    def coefficients(self, feature_names: list[str]) -> dict[str, float]:
        """Centre (OLS) coefficients on standardised features (importance-comparable)."""
        return dict(zip(feature_names, self._estimators[1].coef_.tolist(), strict=True))

    def save(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / 'model.pkl').write_bytes(pickle.dumps(self))

    @classmethod
    def load(cls, out_dir: Path) -> LinearQuantile:
        return pickle.loads((out_dir / 'model.pkl').read_bytes())
