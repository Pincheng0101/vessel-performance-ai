"""JSONL writers for the raw datasets and ground truth.

- One JSON object per line, floats rounded for stability, temporals as
  ``YYYY-MM-DD HH:MM:SS`` / dates as ``YYYY-MM-DD``.
- ``json.dumps(..., allow_nan=False)`` with NaN/Inf coerced to ``null`` — the
  Athena JSON SerDe rejects ``NaN``.
- ``noon_report`` is written under Hive-style ``imo_number=…/year=…`` partition
  directories (partition projection, no crawler); the other datasets are flat.
"""

from __future__ import annotations

import datetime as dt
import json
import math
from collections import defaultdict
from pathlib import Path

from ym_datalake.synthetic_data.generate import GenerationResult

_FLOAT_DECIMALS = 4

# Flat (unpartitioned) raw datasets: attribute name on GenerationResult.
_FLAT_RAW = ['vessel_master', 'reference_curve', 'uwi', 'maintenance_event', 'fuel_price']
_TRUTH = ['ground_truth_daily', 'fouling_segments']


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


def _write_noon_report(raw_dir: Path, records: list[dict]) -> None:
    """Partition noon reports by imo_number + year into Hive-style directories."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for record in records:
        imo = record['imo_number']
        year = record['report_datetime_utc'][:4]
        groups[(imo, year)].append(record)
    for (imo, year), group in sorted(groups.items()):
        path = raw_dir / 'noon_report' / f'imo_number={imo}' / f'year={year}' / 'data.jsonl'
        _write_jsonl(path, group)


def write_all(result: GenerationResult, out_dir: str | Path) -> dict[str, int]:
    """Write every dataset under ``out_dir`` (raw/ and truth/); return row counts."""
    out = Path(out_dir)
    raw_dir = out / 'raw'
    truth_dir = out / 'truth'
    counts: dict[str, int] = {}

    _write_noon_report(raw_dir, result.noon_report)
    counts['noon_report'] = len(result.noon_report)

    for name in _FLAT_RAW:
        records = getattr(result, name)
        _write_jsonl(raw_dir / name / f'{name}.jsonl', records)
        counts[name] = len(records)

    for name in _TRUTH:
        records = getattr(result, name)
        _write_jsonl(truth_dir / f'{name}.jsonl', records)
        counts[name] = len(records)

    return counts
