"""ExtraTrees comparison model for the ME full-speed fuel-consumption benchmark.

Same target, harness, and folds as :mod:`model.xgboost` (see :mod:`model.common`): regresses
``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` and reconstructs MT via
``exp(pred) * hours_full_speed / fuel_lcv``. Like RandomForest, ExtraTrees cannot ingest the NaN-bearing
rolling / ``*_missing`` features, so it sits behind a median :class:`SimpleImputer`. Native importance is
mean impurity decrease.
"""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

from ym_datalake.ml_york.model import common

PARAMS = {'n_estimators': 500, 'max_features': 'sqrt', 'min_samples_leaf': 5, 'n_jobs': -1}


def train_model(train_df: pd.DataFrame, features: list[str], seed: int = 42) -> Pipeline:
    """Fit median-impute -> ExtraTrees on the steady single-fuel labelled rows."""
    x, y, mask = common.build_xy(train_df, features)
    model = Pipeline(
        [
            ('impute', SimpleImputer(strategy='median')),
            ('model', ExtraTreesRegressor(random_state=seed, **PARAMS)),
        ]
    )
    model.fit(x.loc[mask], y.loc[mask])
    return model


def native_importance(fitted: Pipeline, features: list[str]) -> pd.Series:
    """Mean impurity-decrease importance as a feature-indexed Series, sorted descending."""
    return pd.Series(fitted.named_steps['model'].feature_importances_, index=features).sort_values(ascending=False)


def run_evaluate(
    features_path: str, manifest_path: str, out_dir: str, folds_n: int = 10, seed: int = 42, tol: float = 0.05
) -> int:
    return common.run_evaluate(train_model, features_path, manifest_path, out_dir, folds_n, seed, tol)


def run_importance(
    features_path: str, manifest_path: str, top: int = 20, out_path: str | None = None, seed: int = 42
) -> pd.DataFrame:
    return common.run_importance(train_model, native_importance, features_path, manifest_path, top, out_path, seed)
