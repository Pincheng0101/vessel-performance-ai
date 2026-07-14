"""Structural checks on the 20-table catalog, and its agreement with the real source files."""

import csv
import json
from pathlib import Path

import pytest

from table.schema import (
    ALL_TABLES,
    CURATED_TABLES,
    MAINTENANCE_EVENT_COLUMNS,
    NOON_REPORT_COLUMNS,
    RAW_TABLES,
    SHIP_IDS,
    VESSEL_MASTER_COLUMNS,
)

DATASET = Path(__file__).resolve().parents[3] / 'dataset'
VALID_GLUE_TYPES = {'string', 'int', 'double', 'boolean'}

SHIP_ID_HEADER = 'De-identification Name'
MARKER_COLUMNS = {'masked_flag', 'predict_fuel_type'}


def _header(csv_name: str) -> list[str]:
    with (DATASET / csv_name).open(encoding='utf-8-sig') as fh:
        return next(csv.reader(fh))


def test_catalog_is_exactly_twenty_tables() -> None:
    assert len(RAW_TABLES) == 6
    assert len(CURATED_TABLES) == 14
    assert len(ALL_TABLES) == 20
    assert not set(RAW_TABLES) & set(CURATED_TABLES), 'a table name may not appear in both zones'


@pytest.mark.parametrize('name', sorted(ALL_TABLES))
def test_column_list_structure(name: str) -> None:
    columns = ALL_TABLES[name]
    assert columns, f'{name} has no columns'
    names = [column for column, _ in columns]
    assert len(names) == len(set(names)), f'{name} has duplicate column names'
    bad = {glue_type for _, glue_type in columns} - VALID_GLUE_TYPES
    assert not bad, f'{name} has invalid glue types: {bad}'


def test_noon_report_mirrors_the_vt_fd_header() -> None:
    """noon_report is vt_fd verbatim: every source column, plus exactly the two markers."""
    header = _header('vt_fd.csv')
    assert len(header) == 40

    expected = {'ship_id' if h == SHIP_ID_HEADER else h.lower() for h in header} | MARKER_COLUMNS
    assert {name for name, _ in NOON_REPORT_COLUMNS} == expected

    types = dict(NOON_REPORT_COLUMNS)
    assert types['masked_flag'] == 'boolean'
    assert types['predict_fuel_type'] == 'string'
    assert types['noon_utc'] == 'int'
    assert types['ship_id'] == 'string'
    assert types['voyage'] == 'string'


def test_maintenance_event_mirrors_the_csv_plus_the_split_marker() -> None:
    """maintenance_event is the 9 source columns, plus source_event_type for the `+` split."""
    header = _header('maintenance.csv')
    names = [name for name, _ in MAINTENANCE_EVENT_COLUMNS]
    assert names[:-1] == header
    assert names[-1] == 'source_event_type'


def test_vessel_master_mirrors_vessel_jsonl() -> None:
    with (DATASET / 'vessel.jsonl').open(encoding='utf-8') as fh:
        first = json.loads(next(fh))
    assert {name for name, _ in VESSEL_MASTER_COLUMNS} == set(first)
    assert len(VESSEL_MASTER_COLUMNS) == 32


def test_ship_ids_match_the_data() -> None:
    for csv_name, column in (('vt_fd.csv', SHIP_ID_HEADER), ('maintenance.csv', 'ship_id')):
        with (DATASET / csv_name).open(encoding='utf-8-sig') as fh:
            assert {row[column] for row in csv.DictReader(fh)} == set(SHIP_IDS)
    assert len(SHIP_IDS) == 15


def test_ship_id_is_an_ordinary_body_column_everywhere() -> None:
    """No table is partitioned, so ship_id is never a partition key hidden out of the body."""
    shipless = {'fuel_price', 'dim_port', 'agg_fleet_daily'}  # these grains genuinely have no single ship
    for name, columns in ALL_TABLES.items():
        if name in shipless:
            continue
        assert 'ship_id' in {column for column, _ in columns}, f'{name} must carry ship_id in its body'
