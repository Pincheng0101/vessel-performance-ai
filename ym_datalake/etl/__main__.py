"""CLI: ``python -m ym_datalake.etl <compute|validate|load-real> ...``."""

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


def _resolve_bucket(args: argparse.Namespace) -> str | None:
    """--bucket if given, else app.datalake.bucket_name from conf/<env>.conf."""
    if args.bucket:
        return args.bucket
    conf_path = f'conf/{args.env}.conf'
    if not os.path.isfile(conf_path):
        return None
    from pyhocon import ConfigFactory  # lazy: only when falling back to conf

    return ConfigFactory.parse_file(conf_path).get('app.datalake.bucket_name', '') or None


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
        bucket = _resolve_bucket(args)
        if not bucket:
            print(
                f'error: --upload requires --bucket or app.datalake.bucket_name in conf/{args.env}.conf',
                file=sys.stderr,
            )
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.etl import uploader  # lazy: only when uploading

        keys = uploader.upload_curated(bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{bucket}/curated/ (region {args.region})')

    return exit_code


def _cmd_load_real(args: argparse.Namespace) -> int:
    from ym_datalake.etl.real_data import load_maintenance, load_vt_fd, write_real_data

    data_dir = args.data_dir
    vt_fd_rows = load_vt_fd(f'{data_dir}/vt_fd.csv')
    maintenance_rows = load_maintenance(f'{data_dir}/maintenance.csv')
    counts = write_real_data(vt_fd_rows, maintenance_rows, args.out)

    n_predict = sum(1 for r in vt_fd_rows if r['predict_fuel_type'])
    n_masked = sum(1 for r in vt_fd_rows if r['masked_flag'])
    print(f'Real data → {args.out}/raw')
    for name, n in counts.items():
        print(f'  {name:<28} {n:>8} rows')
    print(f'  masked rows {n_masked}, PREDICT cells {n_predict}')

    if args.upload:
        bucket = _resolve_bucket(args)
        if not bucket:
            print(
                f'error: --upload requires --bucket or app.datalake.bucket_name in conf/{args.env}.conf',
                file=sys.stderr,
            )
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.etl import uploader  # lazy: only when uploading

        keys = uploader.upload_real_data(bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{bucket}/raw/ (region {args.region})')

    return 0


def _cmd_compute_real(args: argparse.Namespace) -> int:
    from ym_datalake.etl.real_compute import compute_all, write_curated
    from ym_datalake.etl.real_data import load_maintenance, load_vt_fd

    tables = compute_all(load_vt_fd(f'{args.data_dir}/vt_fd.csv'), load_maintenance(f'{args.data_dir}/maintenance.csv'))
    counts = write_curated(tables, args.out)
    print(f'Curated (real) → {args.out}/curated')
    for name, n in counts.items():
        print(f'  {name:<42} {n:>8} rows')

    if args.upload:
        bucket = _resolve_bucket(args)
        if not bucket:
            print(
                f'error: --upload requires --bucket or app.datalake.bucket_name in conf/{args.env}.conf',
                file=sys.stderr,
            )
            return 2
        os.environ.setdefault('AWS_DEFAULT_REGION', args.region)
        from ym_datalake.etl import uploader  # lazy: only when uploading

        keys = uploader.upload_real_curated(bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{bucket}/curated/ (region {args.region})')

    return 0


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
    comp.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    comp.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    comp.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    comp.set_defaults(func=_cmd_compute)

    real = sub.add_parser('load-real', help='load the real hackathon CSVs into the raw JSONL tree')
    real.add_argument('--data', dest='data_dir', default='./data', help='directory with the CSVs (default: ./data)')
    real.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    real.add_argument('--upload', action='store_true', help='upload raw/vt_fd + raw/maintenance to S3')
    real.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    real.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    real.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    real.set_defaults(func=_cmd_load_real)

    creal = sub.add_parser(
        'compute-real', help='compute curated tables (speed loss/anomalies/alerts/recos) from the real CSVs'
    )
    creal.add_argument('--data', dest='data_dir', default='./data', help='directory with the CSVs (default: ./data)')
    creal.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    creal.add_argument('--upload', action='store_true', help='upload curated/fact_ship_* to S3')
    creal.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    creal.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    creal.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    creal.set_defaults(func=_cmd_compute_real)

    val = sub.add_parser('validate', help='validate a previously written curated tree (C13)')
    val.add_argument('--dir', default='./tmp', help='directory holding curated/ and truth/ (default: ./tmp)')
    val.set_defaults(func=_cmd_validate)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
