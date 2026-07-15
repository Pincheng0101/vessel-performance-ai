"""``model`` — trained submission models for the ME full-speed fuel-consumption task.

A namespace over one subpackage per model family (currently :mod:`model.xgboost`). Every model
orchestrates the model-agnostic :mod:`ym_datalake.ml_york.evaluation` harness to self-score, and reads
its inputs strictly from ``manifest['predict_safe_features']`` — the same leakage firewall the harness
enforces — so training can never see an H/T column that a real ``PREDICT`` cell would hide.
"""
