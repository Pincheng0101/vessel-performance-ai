"""CLI: run the random_forest model through the eval harness, or rank its feature importance.

    python -m ym_datalake.ml_york.model.random_forest evaluate \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval/random_forest
    python -m ym_datalake.ml_york.model.random_forest importance \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --top 20
"""

from __future__ import annotations

import argparse

from ym_datalake.ml_york.model.random_forest import model


def _cmd_evaluate(args: argparse.Namespace) -> int:
    return model.run_evaluate(args.features, args.manifest, args.out_dir, args.folds, args.seed, args.tolerance)


def _cmd_importance(args: argparse.Namespace) -> int:
    model.run_importance(args.features, args.manifest, args.top, args.out, args.seed)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.ml_york.model.random_forest', description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)

    ev = sub.add_parser('evaluate', help='train + score one model per masked-holdout fold')
    ev.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV')
    ev.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    ev.add_argument('--out-dir', default='etl/eval/random_forest', help='root output dir; one subfolder per fold')
    ev.add_argument('--folds', type=int, default=10, help='number of folds (default: 10)')
    ev.add_argument('--seed', type=int, default=42, help='RNG seed for the fold shuffle + model (default: 42)')
    ev.add_argument(
        '--tolerance', type=float, default=0.05, help='relative-error tolerance for precision (default: 0.05)'
    )
    ev.set_defaults(func=_cmd_evaluate)

    im = sub.add_parser('importance', help='fit on 80%%; report native + permutation importance on the 20%% holdout')
    im.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV')
    im.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    im.add_argument('--top', type=int, default=20, help='how many top features to print (default: 20)')
    im.add_argument('--out', default=None, help='optional CSV path for the full importance table')
    im.add_argument('--seed', type=int, default=42, help='RNG seed for the holdout split + model (default: 42)')
    im.set_defaults(func=_cmd_importance)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
