"""JSONL writer shared by the real-data ETL.

One JSON object per line, floats rounded for stability, temporals as
``YYYY-MM-DD HH:MM:SS`` / dates as ``YYYY-MM-DD``. ``json.dumps(...,
allow_nan=False)`` with NaN/Inf coerced to ``null`` — the Athena JSON SerDe
rejects ``NaN``.
"""

from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path

_FLOAT_DECIMALS = 4


def _clean(value):
    """Coerce a value into a JSON-safe, rounded form (NaN/Inf → None)."""
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return round(value, _FLOAT_DECIMALS)
    if isinstance(value, dt.datetime):
        return value.strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(value, dt.date):
        return value.isoformat()
    return value


def _clean_record(record: dict) -> dict:
    return {k: _clean(v) for k, v in record.items()}


def _write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as fh:
        for record in records:
            fh.write(json.dumps(_clean_record(record), allow_nan=False, ensure_ascii=False))
            fh.write('\n')
