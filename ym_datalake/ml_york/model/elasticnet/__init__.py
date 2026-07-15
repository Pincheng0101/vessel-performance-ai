"""``model.elasticnet`` — ElasticNet linear comparison model, benchmarked against the XGBoost submission.

Regresses ``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` and reconstructs the per-fuel
MT via ``exp(pred) * hours_full_speed / fuel_lcv``, on the same folds/seed/harness as
:mod:`model.xgboost` so metric and importance comparisons are apples-to-apples. See
:mod:`model.elasticnet.model` and the shared :mod:`model.common`.
"""

from ym_datalake.ml_york.model.elasticnet.model import (
    native_importance,
    run_evaluate,
    run_importance,
    train_model,
)

__all__ = ['native_importance', 'run_evaluate', 'run_importance', 'train_model']
