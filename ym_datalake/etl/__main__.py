"""CLI: ``python -m ym_datalake.etl <compute|validate> ...``."""

from __future__ import annotations

import argparse
import os
import sys

from ym_datalake.etl.compute import compute_curated
from ym_datalake.etl.validate import (
    check_c13,
    check_c13_from_disk,
    check_c14,
    check_c18,
    check_c19,
    check_c20,
    print_report,
)
from ym_datalake.etl.writer import write_all
from ym_datalake.synthetic_data.validate import load_result

_DEFAULT_REGION = 'us-west-2'


def _cmd_compute(args: argparse.Namespace) -> int:
    raw = load_result(args.in_dir)
    if not raw.noon_report:
        print(
            f'error: no raw noon_report found under {args.in_dir!r} — run synthetic_data generate first',
            file=sys.stderr,
        )
        return 2

    curated = compute_curated(raw)
    counts = write_all(curated, args.out)
    print(f'Curated → {args.out}/curated')
    for name, n in counts.items():
        print(f'  {name:<28} {n:>8} rows')

    exit_code = 0
    if args.validate:
        print('\nRunning closed-loop checks (C13):')
        if not print_report(check_c13(curated, raw.ground_truth_daily)):
            exit_code = 1
        print('\nRunning statistical-insight checks (C14):')
        if not print_report(check_c14(curated, raw.ground_truth_daily)):
            exit_code = 1
        print('\nRunning voyage energy-balance check (C18):')
        if not print_report(check_c18(curated, raw.noon_report)):
            exit_code = 1
        print('\nRunning economical-speed check (C19):')
        if not print_report(check_c19(curated)):
            exit_code = 1
        print('\nRunning weather-attribution check (C20):')
        if not print_report(check_c20(curated)):
            exit_code = 1

    if args.upload:
        if not args.bucket:
            print('error: --upload requires --bucket', file=sys.stderr)
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.etl import uploader  # lazy: only when uploading

        keys = uploader.upload_curated(args.bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{args.bucket}/curated/ (region {args.region})')

    return exit_code


def _cmd_validate(args: argparse.Namespace) -> int:
    results = check_c13_from_disk(args.dir)
    print(f'Validating {args.dir}/curated against ground truth (C13):')
    return 0 if print_report(results) else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.etl')
    sub = parser.add_subparsers(dest='command', required=True)

    comp = sub.add_parser('compute', help='compute curated tables from the raw zone')
    comp.add_argument('--in', dest='in_dir', default='./tmp', help='raw/truth input directory (default: ./tmp)')
    comp.add_argument('--out', default='./tmp', help='curated output directory (default: ./tmp)')
    comp.add_argument('--validate', action='store_true', help='run C13 closed-loop checks after computing')
    comp.add_argument('--upload', action='store_true', help='upload curated/ tree to S3')
    comp.add_argument('--bucket', help='target S3 bucket (required with --upload)')
    comp.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    comp.set_defaults(func=_cmd_compute)

    val = sub.add_parser('validate', help='validate a previously written curated tree (C13)')
    val.add_argument('--dir', default='./tmp', help='directory holding curated/ and truth/ (default: ./tmp)')
    val.set_defaults(func=_cmd_validate)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
