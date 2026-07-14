"""CLI: ``python -m ym_datalake.synthetic_data <generate|validate> ...``."""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sys

from ym_datalake.synthetic_data.generate import generate
from ym_datalake.synthetic_data.validate import load_result, print_report, validate_result
from ym_datalake.synthetic_data.writer import write_all

_DEFAULT_START = '2021-07-01'
_DEFAULT_END = '2026-06-30'
_DEFAULT_REGION = 'us-west-2'


def _parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def _cmd_generate(args: argparse.Namespace) -> int:
    result = generate(_parse_date(args.start), _parse_date(args.end), args.seed)
    counts = write_all(result, args.out)
    print(f'Generated → {args.out}')
    for name, n in counts.items():
        print(f'  {name:<20} {n:>8} rows')

    exit_code = 0
    if args.validate:
        print('\nRunning consistency checks (C1–C17):')
        if not print_report(validate_result(result)):
            exit_code = 1

    if args.upload:
        if not args.bucket:
            print('error: --upload requires --bucket', file=sys.stderr)
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.synthetic_data import uploader  # lazy: only when uploading

        keys = uploader.upload_raw(args.bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{args.bucket}/raw/ (region {args.region})')

    return exit_code


def _cmd_validate(args: argparse.Namespace) -> int:
    result = load_result(args.dir)
    if not result.noon_report:
        print(f'error: no noon_report data found under {args.dir!r}', file=sys.stderr)
        return 2
    print(f'Validating {args.dir} (C1–C17):')
    return 0 if print_report(validate_result(result)) else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.synthetic_data')
    sub = parser.add_subparsers(dest='command', required=True)

    gen = sub.add_parser('generate', help='generate raw datasets + ground truth')
    gen.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    gen.add_argument('--seed', type=int, default=42, help='master RNG seed (default: 42)')
    gen.add_argument('--start', default=_DEFAULT_START, help=f'start date YYYY-MM-DD (default: {_DEFAULT_START})')
    gen.add_argument('--end', default=_DEFAULT_END, help=f'end date YYYY-MM-DD (default: {_DEFAULT_END})')
    gen.add_argument('--validate', action='store_true', help='run C1–C17 checks after generating')
    gen.add_argument('--upload', action='store_true', help='upload raw/ tree to S3 (skips truth/)')
    gen.add_argument('--bucket', help='target S3 bucket (required with --upload)')
    gen.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    gen.set_defaults(func=_cmd_generate)

    val = sub.add_parser('validate', help='validate a previously generated ./tmp tree')
    val.add_argument('--dir', default='./tmp', help='directory to validate (default: ./tmp)')
    val.set_defaults(func=_cmd_validate)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
