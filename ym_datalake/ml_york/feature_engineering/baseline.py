"""Verification-only RandomForest baseline: sanity-check that the engineered features carry signal.

Not a submission model — it exists to (a) prove ``predict_safe_features`` alone (no H/T leakage) can
learn ME full-speed energy, and (b) rank feature importance so the FE choices are auditable. Trains on
the S1-S12 training ships, steady-state rows only (the README gate the PREDICT cells were filtered to).

sklearn's ``RandomForestRegressor`` is used because it runs without ``libomp`` (unlike xgboost/lightgbm)
and exposes ``.feature_importances_``. The later, real training phase can swap in a boosted tree.

    python -m ym_datalake.ml_york.feature_engineering.baseline [--etl etl] [--top 20]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor

TRAIN_SHIPS = [f'S{i}' for i in range(1, 13)]
TARGET = 'target_energy_mj'


def run(etl_dir: str = 'etl', top: int = 20, n_estimators: int = 200, seed: int = 0) -> pd.Series:
    etl = Path(etl_dir)
    df = pd.read_csv(etl / 'vt_fd_features.csv', low_memory=False)
    manifest = json.loads((etl / 'feature_manifest.json').read_text(encoding='utf-8'))
    features = manifest['predict_safe_features']

    train = df[df['ship_id'].isin(TRAIN_SHIPS) & df['is_steady_state'] & df[TARGET].notna()]
    # RF can't ingest NaN; median-impute the (visible) inputs. This is verification, not the real model.
    x = train[features].apply(pd.to_numeric, errors='coerce')
    x = x.fillna(x.median(numeric_only=True)).fillna(0.0)
    y = train[TARGET]

    model = RandomForestRegressor(n_estimators=n_estimators, random_state=seed, n_jobs=-1)
    model.fit(x, y)

    importance = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
    print(f'trained on {len(train)} steady-state rows (S1-S12), {len(features)} predict-safe features')
    print(f'in-sample R^2 = {model.score(x, y):.4f}')
    print(f'\ntop {top} feature importances ({TARGET}):')
    for rank, (name, val) in enumerate(importance.head(top).items(), 1):
        print(f'  {rank:2d}. {name:34s} {val:.4f}')
    return importance


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--etl', default='etl', help='dir holding vt_fd_features.csv + feature_manifest.json')
    parser.add_argument('--top', type=int, default=20)
    args = parser.parse_args()
    run(args.etl, args.top)


if __name__ == '__main__':
    main()
