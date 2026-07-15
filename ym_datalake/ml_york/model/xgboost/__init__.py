"""``model.xgboost`` — the boosted-tree submission model that replaces the RF verification baseline.

Regresses ``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` only, then reconstructs the
per-fuel MT submission via ``exp(pred) * hours_full_speed / fuel_lcv`` (both predict-safe). ``evaluate``
runs it through the 10-fold masked-holdout harness; ``predict`` trains on every labelled steady
single-fuel row and answers the real 102 ``PREDICT`` cells. See :mod:`model.xgboost.model`.
"""

from ym_datalake.ml_york.model.xgboost.model import (
    build_xy,
    predict_cells,
    run_evaluate,
    run_predict,
    train_model,
)

__all__ = ['build_xy', 'predict_cells', 'run_evaluate', 'run_predict', 'train_model']
