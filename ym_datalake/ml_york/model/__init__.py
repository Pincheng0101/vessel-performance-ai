"""``model`` — trained + benchmark models for the ME full-speed fuel-consumption task.

:mod:`model.xgboost` is the submission model. Alongside it, five non-DL, feature-importance-capable
comparison families — :mod:`model.lightgbm`, :mod:`model.random_forest`, :mod:`model.extra_trees`,
:mod:`model.hist_gbdt`, :mod:`model.elasticnet` — are benchmarked against it on the same target, folds,
and harness via the shared :mod:`model.common` orchestration; :mod:`model.compare` prints/writes the
cross-model scoreboard and permutation-importance ranking.

Every model orchestrates the model-agnostic :mod:`ym_datalake.ml_york.evaluation` harness to self-score,
and reads its inputs strictly from ``manifest['predict_safe_features']`` — the same leakage firewall the
harness enforces — so training can never see an H/T column that a real ``PREDICT`` cell would hide.
"""
