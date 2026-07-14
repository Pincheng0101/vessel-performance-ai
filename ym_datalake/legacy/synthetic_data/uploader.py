"""Upload the local ``raw/`` tree to S3 (ground truth under ``truth/`` is skipped).

The module-level ``s3`` client is the test mocking boundary, mirroring
``lambda_function/athena_query/config.py``: patch
``ym_datalake.synthetic_data.uploader.s3`` to assert calls without AWS.
"""

from __future__ import annotations

import os
from pathlib import Path

import boto3

s3 = boto3.client('s3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None)


def upload_raw(bucket: str, out_dir: str | Path = './tmp') -> list[str]:
    """Put every ``raw/**/*.jsonl`` file to ``s3://{bucket}/raw/...``; return keys.

    Keys mirror the local layout under ``out_dir`` (so the ``noon_report``
    partition directories map straight onto the S3 prefixes the Glue table
    projects). The ``truth/`` tree is never walked, so it is never uploaded.
    """
    root = Path(out_dir)
    raw_dir = root / 'raw'
    if not raw_dir.is_dir():
        raise FileNotFoundError(f'no raw/ directory under {out_dir!r} — run generate first')

    keys: list[str] = []
    for path in sorted(raw_dir.rglob('*.jsonl')):
        key = path.relative_to(root).as_posix()
        s3.put_object(Bucket=bucket, Key=key, Body=path.read_bytes())
        keys.append(key)
    return keys
