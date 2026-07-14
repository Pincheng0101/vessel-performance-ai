"""PRESERVATION — the one contract the raw zone may never break.

Every row and every column of ``vt_fd.csv``, ``vessel.jsonl`` and ``maintenance.csv``
survives into the raw zone **verbatim**. Not deduped, not clipped, not backfilled, not
reordered away. If a test in this file fails, the lake is lying about its own source data
and nothing downstream can be trusted.

The two sanctioned transformations are both information-*preserving*, and both are checked
here rather than taken on faith:

* ``HIDDEN``/``PREDICT`` -> null, with ``masked_flag`` / ``predict_fuel_type`` recording
  what was destroyed;
* ``maintenance.event_type`` split on ``+`` into atoms (77 rows -> 115), which is verified
  by **regrouping the 115 atoms back into the 77 source rows**.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

import pytest

from ym_datalake.etl import source
from ym_datalake.schema import MAINTENANCE_EVENT_COLUMNS, NOON_REPORT_COLUMNS, VESSEL_MASTER_COLUMNS

DATASET = Path(__file__).resolve().parents[3] / 'dataset'

SHIP_ID_HEADER = 'De-identification Name'
PLACEHOLDERS = ('HIDDEN', 'PREDICT')


@pytest.fixture(scope='module')
def vt_fd_csv() -> list[dict]:
    with (DATASET / 'vt_fd.csv').open(encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


@pytest.fixture(scope='module')
def maintenance_csv() -> list[dict]:
    with (DATASET / 'maintenance.csv').open(encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


@pytest.fixture(scope='module')
def vessel_jsonl() -> list[dict]:
    with (DATASET / 'vessel.jsonl').open(encoding='utf-8') as fh:
        return [json.loads(line) for line in fh if line.strip()]


@pytest.fixture(scope='module')
def noon_report() -> list[dict]:
    return source.load_noon_report(DATASET / 'vt_fd.csv')


@pytest.fixture(scope='module')
def vessel_master() -> list[dict]:
    return source.load_vessel_master(DATASET / 'vessel.jsonl')


@pytest.fixture(scope='module')
def maintenance_event() -> list[dict]:
    return source.load_maintenance_event(DATASET / 'maintenance.csv')


# --- noon_report: 21,282 rows x 40 source columns ---------------------------------------


def test_noon_report_keeps_every_row(noon_report, vt_fd_csv) -> None:
    """All 21,282 rows — INCLUDING the 344 duplicate (ship_id, noon_utc) rows."""
    assert len(noon_report) == 21_282
    assert len(noon_report) == len(vt_fd_csv)

    keys = defaultdict(int)
    for row in noon_report:
        keys[(row['ship_id'], row['noon_utc'])] += 1
    duplicates = sum(count - 1 for count in keys.values() if count > 1)
    assert duplicates == 344, 'the raw zone must not dedupe — that is the curated zone`s job'


def test_noon_report_keeps_every_column(noon_report, vt_fd_csv) -> None:
    """All 40 source columns, plus exactly the two loader markers."""
    body = {name for name, _ in NOON_REPORT_COLUMNS}
    markers = {'masked_flag', 'predict_fuel_type'}
    source_columns = {SHIP_ID_HEADER: 'ship_id'} | {h: h.lower() for h in vt_fd_csv[0] if h != SHIP_ID_HEADER}

    assert len(vt_fd_csv[0]) == 40
    assert body - markers == set(source_columns.values())
    assert set(noon_report[0]) == body


def test_noon_report_every_cell_round_trips(noon_report, vt_fd_csv) -> None:
    """Every source cell survives, modulo the HIDDEN/PREDICT -> null + marker convention."""
    types = dict(NOON_REPORT_COLUMNS)
    for source_row, landed in zip(vt_fd_csv, noon_report, strict=True):
        for header, raw in source_row.items():
            column = 'ship_id' if header == SHIP_ID_HEADER else header.lower()
            landed_value = landed[column]

            if raw in PLACEHOLDERS:
                assert landed_value is None, f'{column}: masked cell must land as null'
                assert landed['masked_flag'] is True
                if raw == 'PREDICT':
                    assert landed['predict_fuel_type'] == header
            elif raw == '':
                assert landed_value is None, f'{column}: an empty source cell stays null'
            elif types[column] == 'string':
                assert landed_value == raw
            elif types[column] == 'int':
                assert landed_value == int(float(raw))
            else:
                assert landed_value == float(raw), f'{column}: {landed_value} != {raw}'


def test_noon_report_masking_is_s21_s23_only(noon_report) -> None:
    masked = {r['ship_id'] for r in noon_report if r['masked_flag']}
    assert masked == {'S21', 'S22', 'S23'}
    assert sum(1 for r in noon_report if r['masked_flag']) == 372
    assert sum(1 for r in noon_report if r['predict_fuel_type']) == 102


# --- vessel_master: 15 rows x 32 columns -------------------------------------------------


def test_vessel_master_keeps_every_row_and_column(vessel_master, vessel_jsonl) -> None:
    assert len(vessel_master) == 15
    assert len(vessel_jsonl) == 15
    assert len(VESSEL_MASTER_COLUMNS) == 32
    for row in vessel_master:
        assert set(row) == {name for name, _ in VESSEL_MASTER_COLUMNS}


def test_vessel_master_every_cell_round_trips(vessel_master, vessel_jsonl) -> None:
    for source_row, landed in zip(vessel_jsonl, vessel_master, strict=True):
        assert len(source_row) == 32
        for column, raw in source_row.items():
            assert landed[column] == raw, f'{column}: {landed[column]} != {raw}'


# --- maintenance_event: 77 source rows -> 115 atoms, exactly reconstructible -------------


def test_maintenance_event_splits_to_115_atoms(maintenance_event, maintenance_csv) -> None:
    assert len(maintenance_csv) == 77
    assert len(maintenance_event) == 115

    counts = defaultdict(int)
    for row in maintenance_event:
        counts[row['event_type']] += 1
    # UWI+PP x31 and UWC+PP x7 each split in two; the four atomic types are all that remain.
    assert dict(counts) == {'UWI': 12 + 31, 'PP': 11 + 31 + 7, 'UWC': 6 + 7, 'DD': 10}
    assert set(counts) == {'PP', 'UWC', 'UWI', 'DD'}, 'event_type must be atomic — no `+` survives'


def test_maintenance_atoms_regroup_into_the_77_source_rows(maintenance_event, maintenance_csv) -> None:
    """The split EXPANDS and never loses: regroup on (ship_id, event_day) to get the source back."""
    groups: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for row in maintenance_event:
        groups[(row['ship_id'], row['event_day'])].append(row)
    assert len(groups) == 77, 'the 115 atoms must regroup to exactly the 77 source events'

    source_columns = [name for name, _ in MAINTENANCE_EVENT_COLUMNS if name != 'source_event_type']
    types = dict(MAINTENANCE_EVENT_COLUMNS)

    for source_row in maintenance_csv:
        key = (source_row['ship_id'], int(source_row['event_day']))
        atoms = groups[key]

        # The original composite is on every atom, verbatim.
        assert {a['source_event_type'] for a in atoms} == {source_row['event_type']}
        # And the atoms are exactly its parts.
        assert sorted(a['event_type'] for a in atoms) == sorted(source_row['event_type'].split('+'))

        # Every other source column is replicated onto every atom, unmutated.
        for atom in atoms:
            for column in source_columns:
                if column == 'event_type':
                    continue
                raw = source_row[column]
                if raw == '':
                    assert atom[column] is None
                elif types[column] == 'string':
                    assert atom[column] == raw
                elif types[column] == 'int':
                    assert atom[column] == int(float(raw))
                else:
                    assert atom[column] == float(raw)


def test_maintenance_sparse_grades_are_preserved_as_sparse(maintenance_event) -> None:
    """The source grades really are this thin; the loader must not invent values."""
    by_source = {}
    for row in maintenance_event:
        by_source[(row['ship_id'], row['event_day'])] = row
    graded = by_source.values()
    assert sum(1 for r in graded if r['hull_coating_condition']) == 26
    assert sum(1 for r in graded if r['propeller_condition']) == 45
    assert sum(1 for r in graded if r['cavitation_found']) == 36
