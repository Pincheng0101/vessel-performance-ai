"""CLI: ``python -m ym_datalake.etl build [--upload]``.

One command, because there is one pipeline. The three verbatim raw tables and the 17
derived ones come out of the same pass — ``reference_curve`` cannot be fitted without the
cleaned, corrected spine, so splitting "load" from "compute" would only mean computing the
same thing twice (see ``curated.compute`` for the DAG).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from table.schema import CURATED_TABLES, RAW_TABLES
from ym_datalake.etl.jsonl import _write_jsonl

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


def _write(tables: dict[str, list[dict]], out_dir: str) -> None:
    """One flat JSONL file per table. No partition directories — no table is partitioned."""
    for zone, catalog in (('raw', RAW_TABLES), ('curated', CURATED_TABLES)):
        for name in catalog:
            _write_jsonl(Path(out_dir) / zone / name / f'{name}.jsonl', tables[name])


def _cmd_build(args: argparse.Namespace) -> int:
    from ym_datalake.etl.curated.compute import build_all

    tables, diagnostics = build_all(args.data_dir, seed=args.seed)
    _write(tables, args.out)

    print(f'Data lake → {args.out}/{{raw,curated}}\n')
    for zone, catalog in (('raw', RAW_TABLES), ('curated', CURATED_TABLES)):
        print(f'  {zone}:')
        for name in catalog:
            print(f'    {name:<38} {len(tables[name]):>7} rows')

    print('\n  Pipeline findings:')
    print(f'    duplicate (ship, day) rows collapsed  {diagnostics["duplicate_rows_collapsed"]}')
    print(f'    ISO 19030 valid rows                  {diagnostics["valid_rows"]}')
    print(f'    WIND_DIRECTION convention chosen      {diagnostics["wind_convention"]}')
    for convention, score in sorted(diagnostics['wind_convention_scores'].items(), key=lambda kv: kv[1]):
        print(f'      {convention:<14} detrended speed-loss sd {score:6.3f} pp')

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

        keys = uploader.upload_raw(bucket, args.out) + uploader.upload_curated(bucket, args.out)
        print(f'\nUploaded {len(keys)} objects to s3://{bucket}/ (region {args.region})')

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog='python -m ym_datalake.etl')
    sub = parser.add_subparsers(dest='command', required=True)

    build = sub.add_parser('build', help='build all 20 tables from the real dataset into the JSONL lake')
    build.add_argument(
        '--data',
        dest='data_dir',
        default='./dataset',
        help='directory with vt_fd.csv / maintenance.csv / vessel.jsonl (default: ./dataset)',
    )
    build.add_argument('--out', default='./tmp', help='output directory (default: ./tmp)')
    build.add_argument('--seed', type=int, default=42, help='seed for the synthesized columns (default: 42)')
    build.add_argument('--upload', action='store_true', help='upload all 20 tables to S3')
    build.add_argument('--bucket', help='target S3 bucket (default: app.datalake.bucket_name from conf/<env>.conf)')
    build.add_argument('--env', default='dev', help='conf env used to resolve the bucket (default: dev)')
    build.add_argument('--region', default=_DEFAULT_REGION, help=f'AWS region (default: {_DEFAULT_REGION})')
    build.set_defaults(func=_cmd_build)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
