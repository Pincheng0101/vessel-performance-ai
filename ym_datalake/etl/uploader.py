"""Upload the local ``curated/`` tree to S3.

Mirrors ``synthetic_data.uploader``: the module-level ``s3`` client is the test
mocking boundary (patch ``ym_datalake.etl.uploader.s3``), and keys mirror the
local layout so the partition directories map straight onto the S3 prefixes the
Glue tables project.
"""

from __future__ import annotations

import os
from pathlib import Path

import boto3

s3 = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None)


def upload_curated(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put every ``curated/**/*.jsonl`` file to ``s3://{bucket}/curated/...``; return keys."""
    root = Path(out_dir)
    curated_dir = root / 'curated'
    if not curated_dir.is_dir():
        raise FileNotFoundError(f'no curated/ directory under {out_dir!r} — run compute first')

    keys: list[str] = []
    for path in sorted(curated_dir.rglob('*.jsonl')):
        key = path.relative_to(root).as_posix()
        s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes())
        keys.append(key)
    return keys
