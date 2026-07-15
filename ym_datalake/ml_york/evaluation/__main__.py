"""CLI: build the masked-holdout folds, then grade a predictor's answers against them.

    python -m ym_datalake.ml_york.evaluation generate \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval
    python -m ym_datalake.ml_york.evaluation evaluate \
        --features etl/vt_fd_features.csv --eval-dir etl/eval --answer-name answer.csv
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ym_datalake.ml_york.evaluation import folds, scoring

_METRICS = ['precision', 'one_minus_mape', 'mae', 'rmse', 'mape']


def _cmd_generate(args: argparse.Namespace) -> int:
    df = folds.load_features(args.features)
    with open(args.manifest, encoding='utf-8') as f:
        manifest = json.load(f)

    eligible = folds.select_eligible(df)
    fold_rows = folds.assign_folds(eligible, args.folds, args.seed)

    print(f'eligible rows: {len(eligible)}  →  {args.folds} folds (seed {args.seed})')
    for k, rows in enumerate(fold_rows, start=1):
        folds.write_fold(df, manifest, rows, str(Path(args.out_dir) / str(k)))
        print(f'  fold {k:>2}: {len(rows):>6} eval rows  →  {args.out_dir}/{k}/{{train,eval}}.csv')
    return 0


def _cmd_evaluate(args: argparse.Namespace) -> int:
    truth = scoring.build_truth(folds.load_features(args.features))

    header = f'{"fold":>4}  {"n":>5}  {"miss":>4}  ' + '  '.join(f'{m:>14}' for m in _METRICS)
    print(header)
    print('-' * len(header))
    precisions: list[float] = []
    for k in range(1, args.folds + 1):
        fold_dir = Path(args.eval_dir) / str(k)
        expected = scoring.expected_cells(folds.load_features(str(fold_dir / 'eval.csv')))
        answers = scoring.load_answers(str(fold_dir / args.answer_name))
        m = scoring.fold_metrics(expected, truth, answers, args.tolerance)
        precisions.append(m['precision'])
        print(f'{k:>4}  {m["n"]:>5}  {m["n_missing"]:>4}  ' + '  '.join(f'{m[x]:>14.6f}' for x in _METRICS))

    avg = sum(precisions) / len(precisions)
    print('-' * len(header))
    print(f'precision  avg={avg:.6f}  min={min(precisions):.6f}  max={max(precisions):.6f}  (tol={args.tolerance})')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.ml_york.evaluation', description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)

    gen = sub.add_parser('generate', help='write etl/eval/{1..N}/{train,eval}.csv from the feature frame')
    gen.add_argument('--features', default='etl/vt_fd_features.csv', help='feature-engineered CSV (191 cols)')
    gen.add_argument('--manifest', default='etl/feature_manifest.json', help='column-group manifest JSON')
    gen.add_argument('--out-dir', default='etl/eval', help='root output dir; one subfolder per fold')
    gen.add_argument('--folds', type=int, default=10, help='number of folds (default: 10)')
    gen.add_argument('--seed', type=int, default=42, help='RNG seed for the shuffle (default: 42)')
    gen.set_defaults(func=_cmd_generate)

    ev = sub.add_parser('evaluate', help="score each fold's answer.csv against the global truth")
    ev.add_argument('--features', default='etl/vt_fd_features.csv', help='global feature CSV holding the truth')
    ev.add_argument('--eval-dir', default='etl/eval', help='root dir of the generated folds')
    ev.add_argument('--answer-name', default='answer.csv', help='answer filename inside each fold dir')
    ev.add_argument('--folds', type=int, default=10, help='number of folds to score (default: 10)')
    ev.add_argument(
        '--tolerance', type=float, default=0.05, help='relative-error tolerance for precision (default: 0.05)'
    )
    ev.set_defaults(func=_cmd_evaluate)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
