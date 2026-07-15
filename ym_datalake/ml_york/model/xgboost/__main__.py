"""CLI: run the XGBoost model through the eval harness, or emit the real 102-cell submission.

    python -m ym_datalake.ml_york.model.xgboost evaluate \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval
    python -m ym_datalake.ml_york.model.xgboost predict \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out etl/submission.csv
"""

from __future__ import annotations

import argparse

from ym_datalake.ml_york.model.xgboost import model


def _cmd_evaluate(args: argparse.Namespace) -> int:
    return model.run_evaluate(
        args.features,
        args.manifest,
        args.out_dir,
        args.folds,
        args.seed,
        args.tolerance,
        args.n_models,
        args.group_by_ship,
    )


def _cmd_predict(args: argparse.Namespace) -> int:
    return model.run_predict(args.features, args.manifest, args.out, args.n_models)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.ml_york.model.xgboost', description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)

    ev = sub.add_parser('evaluate', help='train + score one model per masked-holdout fold')
    ev.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV')
    ev.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    ev.add_argument('--out-dir', default='etl/eval', help='root output dir; one subfolder per fold')
    ev.add_argument('--folds', type=int, default=10, help='number of folds (default: 10)')
    ev.add_argument('--seed', type=int, default=42, help='RNG seed for the fold shuffle + model (default: 42)')
    ev.add_argument(
        '--tolerance', type=float, default=0.05, help='relative-error tolerance for precision (default: 0.05)'
    )
    ev.add_argument('--n-models', type=int, default=5, help='log-space seed-bagging ensemble size (default: 5)')
    ev.add_argument(
        '--group-by-ship', action='store_true', help='honest leave-one-ship-out folds instead of random folds'
    )
    ev.set_defaults(func=_cmd_evaluate)

    pr = sub.add_parser('predict', help='train on all steady single-fuel rows; write the 102-cell submission')
    pr.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV')
    pr.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    pr.add_argument('--out', default='etl/submission.csv', help='submission CSV path (default: etl/submission.csv)')
    pr.add_argument('--n-models', type=int, default=5, help='log-space seed-bagging ensemble size (default: 5)')
    pr.set_defaults(func=_cmd_predict)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
