"""Upload the lake to S3: ``raw/<table>/<table>.jsonl`` and ``curated/<table>/<table>.jsonl``.

Keys mirror the local layout exactly, and the layout is flat — one file per table, no
partition directories, because no table is partitioned.

The module-level ``s3`` client is the test mocking boundary (patch
``ym_datalake.etl.uploader.s3``).
"""

from __future__ import annotations

import os
from pathlib import Path

import boto3

from ym_datalake.schema import CURATED_TABLES, RAW_TABLES

s3 = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None)


def upload_raw(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put the 6 raw tables to S3; return the keys written."""
    return _upload(bucket, out_dir, 'raw', list(RAW_TABLES))


def upload_curated(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put the 14 curated tables to S3; return the keys written."""
    return _upload(bucket, out_dir, 'curated', list(CURATED_TABLES))


def _upload(bucket: str, out_dir: str | Path, zone: str, names: list[str]) -> list[str]:
    root = Path(out_dir)
    table_dirs = [root / zone / name for name in names]
    if not any(d.is_dir() for d in table_dirs):
        raise FileNotFoundError(f'no {zone}/ tables exist under {out_dir!r} — run `build` first')

    keys: list[str] = []
    for table_dir in table_dirs:
        if not table_dir.is_dir():
            continue
        for path in sorted(table_dir.rglob('*.jsonl')):
            key = path.relative_to(root).as_posix()
            s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes())
            keys.append(key)
    return keys
