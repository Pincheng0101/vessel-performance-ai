"""LightGBM comparison model for the ME full-speed fuel-consumption benchmark.

Same target, harness, and folds as :mod:`model.xgboost` (see :mod:`model.common`): regresses
``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` and reconstructs MT via
``exp(pred) * hours_full_speed / fuel_lcv``. LightGBM ingests NaN natively, so no imputation is needed;
early stopping mirrors the XGBoost budget. Native importance is split gain.
"""

from __future__ import annotations

import pandas as pd
from lightgbm import LGBMRegressor, early_stopping
from sklearn.model_selection import train_test_split

from ym_datalake.ml_york.model import common

# subsample<1 only bags when subsample_freq>0; importance_type='gain' makes feature_importances_ gain-based.
PARAMS = {
    'n_estimators': 2000,
    'learning_rate': 0.03,
    'num_leaves': 31,
    'subsample': 0.8,
    'subsample_freq': 1,
    'colsample_bytree': 0.8,
    'min_child_samples': 20,
    'reg_lambda': 1.0,
    'importance_type': 'gain',
    'verbose': -1,
}


def train_model(train_df: pd.DataFrame, features: list[str], seed: int = 42) -> LGBMRegressor:
    """Fit LightGBM on the steady single-fuel labelled rows, early-stopping on a 10% split."""
    x, y, mask = common.build_xy(train_df, features)
    x_fit, y_fit = x.loc[mask], y.loc[mask]
    x_tr, x_val, y_tr, y_val = train_test_split(x_fit, y_fit, test_size=0.1, random_state=seed)

    model = LGBMRegressor(random_state=seed, n_jobs=-1, **PARAMS)
    model.fit(x_tr, y_tr, eval_set=[(x_val, y_val)], eval_metric='rmse', callbacks=[early_stopping(50, verbose=False)])
    return model


def native_importance(fitted: LGBMRegressor, features: list[str]) -> pd.Series:
    """Split-gain importance (``importance_type='gain'``) as a feature-indexed Series, sorted descending."""
    return pd.Series(fitted.feature_importances_, index=features).sort_values(ascending=False)


def run_evaluate(
    features_path: str, manifest_path: str, out_dir: str, folds_n: int = 10, seed: int = 42, tol: float = 0.05
) -> int:
    return common.run_evaluate(train_model, features_path, manifest_path, out_dir, folds_n, seed, tol)


def run_importance(
    features_path: str, manifest_path: str, top: int = 20, out_path: str | None = None, seed: int = 42
) -> pd.DataFrame:
    return common.run_importance(train_model, native_importance, features_path, manifest_path, top, out_path, seed)
