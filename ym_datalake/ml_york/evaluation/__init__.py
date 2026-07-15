"""``evaluation`` — a synthetic 10-fold masked-holdout harness for the fuel-consumption task.

The real task is to predict ``ME_FULLSPEED_CONSUMP_*`` (MT/day) for the 102 ``PREDICT`` cells on
S21–S23, which carry no local truth. To score a predictor before it ever sees those cells we hide
*known* single-fuel labels: each fold blanks the target + leakage columns on a disjoint slice of
labelled rows (mirroring a real ``PREDICT`` row), the predictor answers, and ``scoring`` grades the
answers against the truth still held in the global ``etl/vt_fd_features.csv``.

Inputs are the feature-engineered ``etl/vt_fd_features.csv`` + ``etl/feature_manifest.json`` (column
groups read from the manifest, never imported from ``feature_engineering``). CLI::

    python -m ym_datalake.ml_york.evaluation generate  --features etl/vt_fd_features.csv ...
    python -m ym_datalake.ml_york.evaluation evaluate  --features etl/vt_fd_features.csv ...
"""
