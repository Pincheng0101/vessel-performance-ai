"""Upload the local ``ml/`` tree to S3 — mirrors ``etl.uploader``.

The module-level ``s3`` client is the test mocking boundary (patch
``ym_datalake.ml.uploader.s3``); keys mirror the local layout so the
``fact_ml_prediction`` partition directories land on the prefixes the Glue
table projects.
"""

from __future__ import annotations

import os
from pathlib import Path

import boto3

s3 = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None)


def upload_ml(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put every ``ml/**/*.jsonl`` file to ``s3://{bucket}/ml/...``; return keys."""
    root = Path(out_dir)
    ml_dir = root / 'ml'
    if not ml_dir.is_dir():
        raise FileNotFoundError(f'no ml/ directory under {out_dir!r} — run infer first')

    keys: list[str] = []
    for path in sorted(ml_dir.rglob('*.jsonl')):
        key = path.relative_to(root).as_posix()
        s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes())
        keys.append(key)
    return keys
