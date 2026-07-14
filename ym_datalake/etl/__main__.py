"""CLI: ``python -m ym_datalake.etl <load-real|compute-real> ...``."""

from __future__ import annotations

import argparse
import os
import sys

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


def _cmd_load_real(args: argparse.Namespace) -> int:
    from ym_datalake.etl.real_data import load_maintenance, load_vessel, load_vt_fd, write_real_data

    data_dir = args.data_dir
    vt_fd_rows = load_vt_fd(f'{data_dir}/vt_fd.csv')
    maintenance_rows = load_maintenance(f'{data_dir}/maintenance.csv')
    vessel_rows = load_vessel(f'{data_dir}/vessel.jsonl')
    counts = write_real_data(vt_fd_rows, maintenance_rows, vessel_rows, args.out)

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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.etl')
    sub = parser.add_subparsers(dest='command', required=True)

    real = sub.add_parser('load-real', help='load the real hackathon source files into the raw JSONL tree')
    real.add_argument(
        '--data',
        dest='data_dir',
        default='./dataset',
        help='directory with vt_fd/maintenance.csv + vessel.jsonl (default: ./dataset)',
    )
    real.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    real.add_argument('--upload', action='store_true', help='upload raw/vt_fd + raw/maintenance + raw/vessel to S3')
    real.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    real.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    real.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    real.set_defaults(func=_cmd_load_real)

    creal = sub.add_parser(
        'compute-real', help='compute curated tables (speed loss/anomalies/alerts/recos) from the real CSVs'
    )
    creal.add_argument(
        '--data', dest='data_dir', default='./dataset', help='directory with the CSVs (default: ./dataset)'
    )
    creal.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    creal.add_argument('--upload', action='store_true', help='upload curated/fact_ship_* to S3')
    creal.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    creal.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    creal.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    creal.set_defaults(func=_cmd_compute_real)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
