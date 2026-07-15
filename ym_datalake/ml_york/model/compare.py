"""Benchmark every comparison model against XGBoost on one identical harness, folds, and holdout.

Runs XGBoost (imported unmodified) plus the five non-DL, importance-capable families
(LightGBM, RandomForest, ExtraTrees, HistGradientBoosting, ElasticNet) through the same 10-fold
masked-holdout eval (:func:`common.evaluate_folds`, same seed) and one shared permutation-importance pass
on an identical 20% holdout (:func:`common.fit_holdout` + :func:`common.permutation_importance_shared`).

Deliverables, printed and written under ``etl/compare/``:
  * ``scoreboard.csv`` — model x {precision avg/min/max, mae, rmse, mape}, XGBoost included as the baseline.
  * ``importance.csv`` — long-format per model: ``permutation`` (the apples-to-apples cross-model ranking,
    same neg-RMSE scoring for every family) alongside each model's ``native`` importance (blank for HistGBR).

    python -m ym_datalake.ml_york.model.compare [--folds 10] [--top 20]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from ym_datalake.ml_york.evaluation import folds
from ym_datalake.ml_york.model import (
    common,
    elasticnet,
    extra_trees,
    hist_gbdt,
    lightgbm,
    random_forest,
    xgboost,
)


def _xgb_native(fitted, features: list[str]) -> pd.Series:
    """XGBoost's own importance (default weighting) — per-model detail, not cross-model comparable."""
    return pd.Series(fitted.feature_importances_, index=features).sort_values(ascending=False)


# name -> (train_model, native_importance). XGBoost is imported, never modified; the shared permutation
# pass — not these native scores — is the apples-to-apples cross-model ranking.
MODELS: dict[str, tuple[common.TrainModel, common.NativeImportance]] = {
    'xgboost': (xgboost.train_model, _xgb_native),
    'lightgbm': (lightgbm.train_model, lightgbm.native_importance),
    'random_forest': (random_forest.train_model, random_forest.native_importance),
    'extra_trees': (extra_trees.train_model, extra_trees.native_importance),
    'hist_gbdt': (hist_gbdt.train_model, hist_gbdt.native_importance),
    'elasticnet': (elasticnet.train_model, elasticnet.native_importance),
}


def _print_scoreboard(score_df: pd.DataFrame) -> None:
    ranked = score_df.sort_values('precision_avg', ascending=False)
    cols = ['precision_avg', 'precision_min', 'precision_max', 'mae', 'rmse', 'mape']
    header = f'{"model":<14}  ' + '  '.join(f'{c:>13}' for c in cols)
    print('\n' + '=' * len(header))
    print('SCOREBOARD  (10-fold masked holdout; precision = share within tolerance, higher better)')
    print('=' * len(header))
    print(header)
    print('-' * len(header))
    for name, row in ranked.iterrows():
        print(f'{name:<14}  ' + '  '.join(f'{row[c]:>13.6f}' for c in cols))


def _print_top_importance(imp_df: pd.DataFrame, top: int) -> None:
    print('\n' + '=' * 60)
    print(f'PERMUTATION IMPORTANCE  (top {top} per model; shared holdout, neg-RMSE scoring)')
    print('=' * 60)
    for name in imp_df['model'].unique():
        rows = imp_df[imp_df['model'] == name].sort_values('perm_rank').head(top)
        print(f'\n{name}:')
        for _, r in rows.iterrows():
            print(f'  {int(r["perm_rank"]):2d}. {r["feature"]:34s} perm={r["permutation"]:.6f}')


def run(
    features_path: str = 'etl/vt_fd_features.csv',
    manifest_path: str = 'etl/feature_manifest.json',
    out_dir: str = 'etl/compare',
    folds_n: int = 10,
    seed: int = 42,
    tol: float = 0.05,
    top: int = 20,
) -> int:
    """Score every model, collect the shared permutation importances, print + write the two deliverables."""
    df = folds.load_features(features_path)
    features = common._load_manifest(manifest_path)['predict_safe_features']

    scoreboard: list[dict] = []
    importance: list[dict] = []
    for name, (train_model, native_importance) in MODELS.items():
        print(f'--- {name}: 10-fold evaluate + shared-holdout permutation importance ---')
        result = common.evaluate_folds(
            train_model, features_path, manifest_path, str(Path(out_dir) / name / 'eval'), folds_n, seed, tol
        )
        scoreboard.append(
            {
                'model': name,
                'precision_avg': result['precision']['avg'],
                'precision_min': result['precision']['min'],
                'precision_max': result['precision']['max'],
                'mae': result['mae']['avg'],
                'rmse': result['rmse']['avg'],
                'mape': result['mape']['avg'],
            }
        )
        print(f'    precision avg={result["precision"]["avg"]:.6f}  rmse avg={result["rmse"]["avg"]:.6f}')

        model, x_ho, y_ho = common.fit_holdout(train_model, df, features, seed)
        perm = common.permutation_importance_shared(model, x_ho, y_ho, features, seed)
        native = native_importance(model, features)
        for rank, (feat, val) in enumerate(perm.items(), 1):
            importance.append(
                {
                    'model': name,
                    'feature': feat,
                    'perm_rank': rank,
                    'permutation': float(val),
                    'native': np.nan if native is None else float(native.get(feat, np.nan)),
                }
            )

    score_df = pd.DataFrame(scoreboard).set_index('model')
    imp_df = pd.DataFrame(importance)

    _print_scoreboard(score_df)
    _print_top_importance(imp_df, top)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    score_df.to_csv(out / 'scoreboard.csv')
    imp_df.to_csv(out / 'importance.csv', index=False)
    print(f'\nwrote {out / "scoreboard.csv"} and {out / "importance.csv"}')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.ml_york.model.compare', description=__doc__)
    parser.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV')
    parser.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    parser.add_argument('--out-dir', default='etl/compare', help='output dir for scoreboard.csv + importance.csv')
    parser.add_argument('--folds', type=int, default=10, help='number of folds (default: 10)')
    parser.add_argument('--seed', type=int, default=42, help='RNG seed for folds + holdout + models (default: 42)')
    parser.add_argument(
        '--tolerance', type=float, default=0.05, help='precision relative-error tolerance (default: 0.05)'
    )
    parser.add_argument(
        '--top', type=int, default=20, help='top-N permutation features to print per model (default: 20)'
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return run(args.features, args.manifest, args.out_dir, args.folds, args.seed, args.tolerance, args.top)


if __name__ == '__main__':
    raise SystemExit(main())
