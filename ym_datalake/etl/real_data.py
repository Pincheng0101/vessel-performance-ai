"""Load the real hackathon CSVs (data/*.csv) into the raw JSONL tree.

Schemas come from ``table.real_data`` (the same lists the Glue tables are
built from), so loader output and catalog stay in lockstep. ``HIDDEN`` /
``PREDICT`` placeholder cells become null; ``masked_flag`` marks such rows and
``predict_fuel_type`` records the PREDICT cell's column in submission
(uppercase) form, e.g. ``ME_FULLSPEED_CONSUMP_HSHFO``. Duplicate source rows
are kept verbatim — dedup is a downstream concern.
"""

from __future__ import annotations

import csv
from pathlib import Path

from table.real_data import MAINTENANCE_COLUMNS, VT_FD_COLUMNS
from ym_datalake.synthetic_data.writer import _write_jsonl

_SHIP_ID_HEADER = 'De-identification Name'
_MARKER_COLUMNS = ('masked_flag', 'predict_fuel_type')
# CSV headers are the uppercase of the body column names.
_VT_FD_FIELDS = [(name, name.upper(), glue_type) for name, glue_type in VT_FD_COLUMNS if name not in _MARKER_COLUMNS]


def _convert(value: str, glue_type: str):
    if value == '':
        return None
    if glue_type == 'double':
        return float(value)
    if glue_type == 'int':
        return int(float(value))
    return value


def load_vt_fd(csv_path: str | Path) -> list[dict]:
    """Parse vt_fd.csv into typed records keyed by the vt_fd table columns (+ ship_id)."""
    rows: list[dict] = []
    with Path(csv_path).open(encoding='utf-8-sig', newline='') as fh:
        for src in csv.DictReader(fh):
            rec: dict = {'ship_id': src[_SHIP_ID_HEADER]}
            masked = False
            predict = None
            for name, header, glue_type in _VT_FD_FIELDS:
                value = src[header]
                if value in ('HIDDEN', 'PREDICT'):
                    masked = True
                    if value == 'PREDICT':
                        predict = header
                    rec[name] = None
                else:
                    rec[name] = _convert(value, glue_type)
            rec['masked_flag'] = masked
            rec['predict_fuel_type'] = predict
            rows.append(rec)
    return rows


def load_maintenance(csv_path: str | Path) -> list[dict]:
    """Parse maintenance.csv into typed records keyed by the maintenance table columns."""
    with Path(csv_path).open(encoding='utf-8-sig', newline='') as fh:
        return [
            {name: _convert(src[name], glue_type) for name, glue_type in MAINTENANCE_COLUMNS}
            for src in csv.DictReader(fh)
        ]


def write_real_data(vt_fd_rows: list[dict], maintenance_rows: list[dict], out_dir: str | Path) -> dict[str, int]:
    """Write both tables under ``out_dir/raw`` (vt_fd Hive-partitioned by ship_id); return row counts."""
    raw_dir = Path(out_dir) / 'raw'

    groups: dict[str, list[dict]] = {}
    for row in vt_fd_rows:
        groups.setdefault(row['ship_id'], []).append(row)
    for ship_id, group in sorted(groups.items()):
        _write_jsonl(raw_dir / 'vt_fd' / f'ship_id={ship_id}' / 'data.jsonl', group)

    _write_jsonl(raw_dir / 'maintenance' / 'maintenance.jsonl', maintenance_rows)

    return {'vt_fd': len(vt_fd_rows), 'maintenance': len(maintenance_rows)}
