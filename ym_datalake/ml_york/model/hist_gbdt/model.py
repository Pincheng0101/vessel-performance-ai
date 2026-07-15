"""HistGradientBoosting comparison model for the ME full-speed fuel-consumption benchmark.

Same target, harness, and folds as :mod:`model.xgboost` (see :mod:`model.common`): regresses
``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` and reconstructs MT via
``exp(pred) * hours_full_speed / fuel_lcv``. HistGBR ingests NaN natively (no imputation) and early-stops
on an internal validation split. It exposes no impurity importance, so ``native_importance`` returns
``None`` — this family relies entirely on the shared permutation-importance pass.
"""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from ym_datalake.ml_york.model import common

PARAMS = {
    'max_iter': 2000,
    'learning_rate': 0.03,
    'max_leaf_nodes': 31,
    'l2_regularization': 1.0,
    'early_stopping': True,
    'validation_fraction': 0.1,
}


def train_model(train_df: pd.DataFrame, features: list[str], seed: int = 42) -> HistGradientBoostingRegressor:
    """Fit HistGBR on the steady single-fuel labelled rows, early-stopping on an internal 10% split."""
    x, y, mask = common.build_xy(train_df, features)
    model = HistGradientBoostingRegressor(random_state=seed, **PARAMS)
    model.fit(x.loc[mask], y.loc[mask])
    return model


def native_importance(fitted: HistGradientBoostingRegressor, features: list[str]) -> None:
    """No impurity importance from HistGBR; covered by the shared permutation pass."""
    return None


def run_evaluate(
    features_path: str, manifest_path: str, out_dir: str, folds_n: int = 10, seed: int = 42, tol: float = 0.05
) -> int:
    return common.run_evaluate(train_model, features_path, manifest_path, out_dir, folds_n, seed, tol)


def run_importance(
    features_path: str, manifest_path: str, top: int = 20, out_path: str | None = None, seed: int = 42
) -> pd.DataFrame:
    return common.run_importance(train_model, native_importance, features_path, manifest_path, top, out_path, seed)
