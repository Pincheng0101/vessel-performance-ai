"""Load the three real source files. VERBATIM — this module mutates nothing.

``dataset/vt_fd.csv`` -> ``noon_report``, ``dataset/vessel.jsonl`` ->
``vessel_master``, ``dataset/maintenance.csv`` -> ``maintenance_event``. Every row
and every column of all three survives into the raw zone unchanged.

The only two transformations here, both information-*preserving*:

1. ``HIDDEN``/``PREDICT`` placeholder cells become null, and the ``masked_flag`` /
   ``predict_fuel_type`` markers record what was there — otherwise the null
   conversion would destroy which cells were masked.
2. ``maintenance.event_type`` is split on ``+`` into atomic events (77 rows -> 115).
   Splitting *expands*: every source column is replicated onto each atom and
   ``source_event_type`` keeps the original composite, so grouping the 115 atoms on
   ``(ship_id, event_day)`` reconstructs the 77 source rows exactly.

Outlier clipping, dedupe, displacement backfill and every other mutation live in
``ym_datalake.etl.curated.clean`` — never here.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from ym_datalake.schema import MAINTENANCE_EVENT_COLUMNS, NOON_REPORT_COLUMNS, VESSEL_MASTER_COLUMNS

_SHIP_ID_HEADER = 'De-identification Name'
_MARKER_COLUMNS = ('masked_flag', 'predict_fuel_type')

# The 9 maintenance.csv headers, in source order (source_event_type is ours).
_MAINTENANCE_SOURCE_COLUMNS = [(n, t) for n, t in MAINTENANCE_EVENT_COLUMNS if n != 'source_event_type']

# vt_fd.csv headers are the uppercase of the noon_report column names; ship_id is
# the odd one out ('De-identification Name').
_VT_FD_FIELDS = [
    (name, _SHIP_ID_HEADER if name == 'ship_id' else name.upper(), glue_type)
    for name, glue_type in NOON_REPORT_COLUMNS
    if name not in _MARKER_COLUMNS
]


def _convert(value: str, glue_type: str):
    if value == '':
        return None
    if glue_type == 'double':
        return float(value)
    if glue_type == 'int':
        return int(float(value))
    return value


def load_noon_report(csv_path: str | Path) -> list[dict]:
    """Parse vt_fd.csv into noon_report rows — all 21,282, all 40 columns, verbatim.

    Duplicate ``(ship_id, noon_utc)`` rows (344 of them) are kept: the raw zone is a
    passthrough, and the curated zone is where the grain becomes unique.
    """
    rows: list[dict] = []
    with Path(csv_path).open(encoding='utf-8-sig', newline='') as fh:
        for src in csv.DictReader(fh):
            rec: dict = {}
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


def load_vessel_master(jsonl_path: str | Path) -> list[dict]:
    """Parse vessel.jsonl into vessel_master rows — all 15, all 32 columns, verbatim.

    The file is committed, hand-derived source data, so it is re-validated against the
    schema rather than trusted: a missing column raises.
    """
    rows: list[dict] = []
    with Path(jsonl_path).open(encoding='utf-8') as fh:
        for line in fh:
            if not line.strip():
                continue
            src = json.loads(line)
            missing = [name for name, _ in VESSEL_MASTER_COLUMNS if name not in src]
            if missing:
                raise ValueError(f'{jsonl_path}: ship {src.get("ship_id")!r} is missing columns {missing}')
            rows.append(
                {
                    name: _convert('' if src[name] is None else str(src[name]), glue_type)
                    for name, glue_type in VESSEL_MASTER_COLUMNS
                }
            )
    return rows


def load_maintenance_event(csv_path: str | Path) -> list[dict]:
    """Parse maintenance.csv and split composite events into atoms: 77 rows -> 115.

    ``UWI+PP`` yields a UWI atom and a PP atom, ``UWC+PP`` a UWC and a PP; the four
    atomic types (PP / UWC / UWI / DD) each map to exactly one reset clock, so no
    ``resets_*`` booleans are needed downstream. Every source column is copied onto
    every atom, and ``source_event_type`` carries the original composite verbatim.
    """
    rows: list[dict] = []
    with Path(csv_path).open(encoding='utf-8-sig', newline='') as fh:
        for src in csv.DictReader(fh):
            record = {name: _convert(src[name], glue_type) for name, glue_type in _MAINTENANCE_SOURCE_COLUMNS}
            composite = src['event_type']  # the source string; never null (it is the event key)
            for atom in composite.split('+'):
                rows.append(record | {'event_type': atom, 'source_event_type': composite})
    return rows


def load_all(data_dir: str | Path) -> dict[str, list[dict]]:
    """Load all three sources from ``data_dir`` (``./dataset``).

    Prefer ``vt_fd_predict.csv`` (the PREDICT cells filled from the final submission) when it
    exists, so the datalake serves predicted fuel consumption; fall back to ``vt_fd.csv``.
    """
    root = Path(data_dir)
    noon_csv = root / 'vt_fd_predict.csv'
    if not noon_csv.is_file():
        noon_csv = root / 'vt_fd.csv'
    return {
        'noon_report': load_noon_report(noon_csv),
        'vessel_master': load_vessel_master(root / 'vessel.jsonl'),
        'maintenance_event': load_maintenance_event(root / 'maintenance.csv'),
    }
