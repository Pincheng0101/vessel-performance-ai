"""ElasticNet comparison model for the ME full-speed fuel-consumption benchmark.

Same target, harness, and folds as :mod:`model.xgboost` (see :mod:`model.common`): regresses
``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` and reconstructs MT via
``exp(pred) * hours_full_speed / fuel_lcv``. The linear model needs finite, comparably scaled inputs, so
it sits behind median imputation + standardization; :class:`ElasticNetCV` picks ``alpha``/``l1_ratio`` by
cross-validation. Native importance is ``abs(coef_)`` on the standardized features.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNetCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ym_datalake.ml_york.model import common

# sklearn>=1.7: `alphas` takes an int (the old `n_alphas`) — 100 regularization points per l1_ratio.
L1_RATIOS = [0.1, 0.5, 0.7, 0.9, 0.95, 1.0]
PARAMS = {'l1_ratio': L1_RATIOS, 'alphas': 100, 'max_iter': 5000}


def train_model(train_df: pd.DataFrame, features: list[str], seed: int = 42) -> Pipeline:
    """Fit median-impute -> standardize -> ElasticNetCV on the steady single-fuel labelled rows."""
    x, y, mask = common.build_xy(train_df, features)
    model = Pipeline(
        [
            ('impute', SimpleImputer(strategy='median')),
            ('scale', StandardScaler()),
            ('model', ElasticNetCV(random_state=seed, n_jobs=-1, **PARAMS)),
        ]
    )
    model.fit(x.loc[mask], y.loc[mask])
    return model


def native_importance(fitted: Pipeline, features: list[str]) -> pd.Series:
    """``abs(coef_)`` on standardized features as a feature-indexed Series, sorted descending."""
    return pd.Series(np.abs(fitted.named_steps['model'].coef_), index=features).sort_values(ascending=False)


def run_evaluate(
    features_path: str, manifest_path: str, out_dir: str, folds_n: int = 10, seed: int = 42, tol: float = 0.05
) -> int:
    return common.run_evaluate(train_model, features_path, manifest_path, out_dir, folds_n, seed, tol)


def run_importance(
    features_path: str, manifest_path: str, top: int = 20, out_path: str | None = None, seed: int = 42
) -> pd.DataFrame:
    return common.run_importance(train_model, native_importance, features_path, manifest_path, top, out_path, seed)
