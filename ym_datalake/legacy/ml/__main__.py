"""CLI: ``python -m ym_datalake.ml <train|backtest|infer|validate> ...`` (§5)."""

from __future__ import annotations

import argparse
import os
import sys

from ym_datalake.ml import registry
from ym_datalake.ml.backtest import run_backtest
from ym_datalake.ml.dataset import build_series, load_inputs
from ym_datalake.ml.features import build_training_set
from ym_datalake.ml.forecast import run_inference
from ym_datalake.ml.models import ARCHITECTURES
from ym_datalake.ml.models.iforest import HealthScorer
from ym_datalake.ml.validate import check_c21, check_c22, check_c23, load_ml_tree, print_report
from ym_datalake.ml.writer import write_ml

_DEFAULT_REGION = 'us-west-2'
_TARGETS = ('speed_loss', 'foc')


def _training_setup(args):
    inputs = load_inputs(args.in_dir)
    series = build_series(inputs)
    if not series:
        print(f'error: no curated daily rows under {args.in_dir!r}', file=sys.stderr)
        raise SystemExit(2)
    fs = build_training_set(series, stride=args.stride)
    print(f'Training set: {fs.X.shape[0]} samples × {fs.X.shape[1]} features over {len(series)} vessels')
    return inputs, series, fs


def _archs(args) -> dict[str, type]:
    names = [a.strip() for a in args.arch.split(',') if a.strip()]
    unknown = [a for a in names if a not in ARCHITECTURES]
    if unknown:
        print(f'error: unknown arch {unknown} (available: {", ".join(ARCHITECTURES)})', file=sys.stderr)
        raise SystemExit(2)
    return {a: ARCHITECTURES[a] for a in names}


def _race(fs, seed: int, archs: dict[str, type]) -> dict[str, dict]:
    """Backtest every architecture per target; return {target: {arch: report}}."""
    races: dict[str, dict] = {}
    for target in _TARGETS:
        races[target] = {}
        print(f'\nBacktest — {target} (RMSE, rolling origin):')
        for arch, cls in archs.items():
            report = run_backtest(fs, target, lambda cls=cls: cls(seed=seed))
            races[target][arch] = report
            gate = 'PASS' if report.passes_gate() else 'FAIL'
            print(f'  [{arch}] gate={gate} mean={report.mean_rmse():.3f}')
            for line in report.summary_lines():
                print(f'    {line}')
        best = _pick_champion(races[target])
        print(f'  → champion: {best}')
    return races


def _pick_champion(reports: dict[str, object]) -> str:
    """Best mean RMSE among gate-passers; falls back to best overall if none pass."""
    passing = {a: r for a, r in reports.items() if r.passes_gate()}
    pool = passing or reports
    return min(pool, key=lambda a: pool[a].mean_rmse())


def _cmd_train(args) -> int:
    archs = _archs(args)
    _, series, fs = _training_setup(args)
    races = _race(fs, args.seed, archs)

    train_start = min(m['as_of'] for m in fs.meta)
    train_end = max(m['target_date'] for m in fs.meta)
    gates_ok = True
    for target in _TARGETS:
        champion = _pick_champion(races[target])
        gates_ok &= races[target][champion].passes_gate()
        y = fs.y_sl if target == 'speed_loss' else fs.y_foc
        for arch, cls in archs.items():
            model = cls(seed=args.seed).fit(fs.X, y)
            mid = registry.save_model(
                args.models,
                model,
                target,
                fs.feature_names,
                train_start,
                train_end,
                args.seed,
                races[target][arch],
                is_champion=(arch == champion),
            )
            marker = ' *champion*' if arch == champion else ''
            print(f'Saved {mid} → {args.models}{marker}')

    health = HealthScorer(seed=args.seed).fit(series)
    print(f'Saved {registry.save_health(args.models, health, train_start, train_end, args.seed)} → {args.models}')

    return 0 if gates_ok else 1


def _cmd_backtest(args) -> int:
    archs = _archs(args)
    _, _, fs = _training_setup(args)
    races = _race(fs, args.seed, archs)
    return 0 if all(races[t][_pick_champion(races[t])].passes_gate() for t in _TARGETS) else 1


def _cmd_infer(args) -> int:
    inputs = load_inputs(args.in_dir)
    series = build_series(inputs)
    sl_model, sl_meta = registry.load_champion(args.models, 'speed_loss')
    foc_model, foc_meta = registry.load_champion(args.models, 'foc')
    health, _ = registry.load_champion(args.models, 'health')

    predictions, plans = run_inference(
        series,
        sl_model,
        sl_meta,
        foc_model,
        foc_meta,
        health,
        inputs.fact_maintenance_event,
        inputs.fact_recommendation,
    )
    counts = write_ml(args.out, predictions, plans, registry.dim_rows(args.models))
    print(f'ML zone → {args.out}/ml')
    for name, n in counts.items():
        print(f'  {name:<28} {n:>8} rows')

    exit_code = 0
    if args.validate:
        print('\nRunning backtest-gate check (C21):')
        if not print_report(check_c21(args.models)):
            exit_code = 1
        print('\nRunning prediction-consistency checks (C22):')
        if not print_report(check_c22(predictions)):
            exit_code = 1
        print('\nRunning maintenance-plan checks (C23):')
        if not print_report(check_c23(plans, predictions)):
            exit_code = 1

    if args.upload:
        if not args.bucket:
            print('error: --upload requires --bucket', file=sys.stderr)
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.ml import uploader  # lazy: only when uploading

        keys = uploader.upload_ml(args.bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{args.bucket}/ml/ (region {args.region})')

    return exit_code


def _cmd_validate(args) -> int:
    predictions, plans = load_ml_tree(args.dir)
    ok = True
    print('Validating ml/ tree (C22):')
    ok &= print_report(check_c22(predictions))
    print('\nValidating ml/ tree (C23):')
    ok &= print_report(check_c23(plans, predictions))
    if args.models:
        print('\nValidating backtest gate (C21):')
        ok &= print_report(check_c21(args.models))
    return 0 if ok else 1


def _add_common(parser) -> None:
    parser.add_argument(
        '--in', dest='in_dir', default='./tmp', help='directory holding curated/ + raw/ (default: ./tmp)'
    )
    parser.add_argument('--models', default='./tmp/models', help='model registry directory (default: ./tmp/models)')
    parser.add_argument('--seed', type=int, default=42, help='deterministic seed (default: 42)')
    parser.add_argument('--stride', type=int, default=7, help='as_of sampling stride in days (default: 7)')
    parser.add_argument(
        '--arch',
        default=','.join(ARCHITECTURES),
        help=f'comma-separated architectures to race (default: {",".join(ARCHITECTURES)})',
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.ml')
    sub = parser.add_subparsers(dest='command', required=True)

    train = sub.add_parser('train', help='backtest, fit and register the champion models')
    _add_common(train)
    train.set_defaults(func=_cmd_train)

    bt = sub.add_parser('backtest', help='rolling-origin backtest report only (no model saved)')
    _add_common(bt)
    bt.set_defaults(func=_cmd_backtest)

    infer = sub.add_parser('infer', help='batch pre-inference → ml/*.jsonl')
    _add_common(infer)
    infer.add_argument('--out', default='./tmp', help='ml output directory (default: ./tmp)')
    infer.add_argument('--validate', action='store_true', help='run C21–C23 after writing')
    infer.add_argument('--upload', action='store_true', help='upload ml/ tree to S3')
    infer.add_argument('--bucket', help='target S3 bucket (required with --upload)')
    infer.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    infer.set_defaults(func=_cmd_infer)

    val = sub.add_parser('validate', help='re-run C22/C23 against a written ml/ tree')
    val.add_argument('--dir', default='./tmp', help='directory holding ml/ (default: ./tmp)')
    val.add_argument('--models', default=None, help='model registry directory (adds C21)')
    val.set_defaults(func=_cmd_validate)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
