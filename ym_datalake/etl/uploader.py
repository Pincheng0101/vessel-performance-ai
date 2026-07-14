"""Upload the real-dataset tables to S3: ``raw/{vt_fd,maintenance,vessel}`` and ``curated/fact_ship_*``.

The module-level ``s3`` client is the test mocking boundary (patch
``ym_datalake.etl.uploader.s3``), and keys mirror the local layout so the
partition directories map straight onto the S3 prefixes the Glue tables project.
"""

from __future__ import annotations

import os
from pathlib import Path

import boto3

s3 = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None)


def upload_real_data(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put the real-dataset tables (``raw/vt_fd/**``, ``raw/maintenance/**``, ``raw/vessel/**``) to S3; return keys.

    This list is an allowlist, not a scan: only these real-data prefixes are
    walked, so a shared ``out_dir`` never re-uploads synthetic raw tables — and a
    new table stays on the floor until it is added here.
    """
    table_dirs = [
        Path(out_dir) / 'raw' / 'vt_fd',
        Path(out_dir) / 'raw' / 'maintenance',
        Path(out_dir) / 'raw' / 'vessel',
    ]
    return _upload_dirs(bucket, out_dir, table_dirs, hint='run load-real first')


# Curated tables produced by ym_datalake.etl.real_compute.
_REAL_CURATED_TABLES = (
    'fact_ship_daily',
    'fact_ship_anomaly',
    'fact_ship_alert',
    'fact_ship_maintenance_recommendation',
)


def upload_real_curated(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put the curated real-dataset tables (``curated/fact_ship_*/**``) to S3; return keys."""
    table_dirs = [Path(out_dir) / 'curated' / name for name in _REAL_CURATED_TABLES]
    return _upload_dirs(bucket, out_dir, table_dirs, hint='run compute-real first')


def _upload_dirs(bucket: str, out_dir: str | Path, table_dirs: list[Path], *, hint: str) -> list[str]:
    root = Path(out_dir)
    if not any(d.is_dir() for d in table_dirs):
        names = ', '.join(d.relative_to(root).as_posix() for d in table_dirs)
        raise FileNotFoundError(f'none of [{names}] exist under {out_dir!r} — {hint}')

    keys: list[str] = []
    for table_dir in table_dirs:
        if not table_dir.is_dir():
            continue
        for path in sorted(table_dir.rglob('*.jsonl')):
            key = path.relative_to(root).as_posix()
            s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes())
            keys.append(key)
    return keys
