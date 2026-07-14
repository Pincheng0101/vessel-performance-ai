"""Structural checks for every column list exported by the table package."""

import pytest

import table

VALID_GLUE_TYPES = {'string', 'int', 'double', 'boolean'}

COLUMN_LISTS = {name: getattr(table, name) for name in dir(table) if name.endswith('_COLUMNS')}


def test_package_exports_column_lists() -> None:
    assert 'VT_FD_COLUMNS' in COLUMN_LISTS
    assert 'MAINTENANCE_COLUMNS' in COLUMN_LISTS
    assert 'NOON_REPORT_COLUMNS' in COLUMN_LISTS
    assert 'FACT_PERFORMANCE_DAILY_COLUMNS' in COLUMN_LISTS


@pytest.mark.parametrize('list_name', sorted(COLUMN_LISTS))
def test_column_list_structure(list_name: str) -> None:
    columns = COLUMN_LISTS[list_name]
    assert columns, f'{list_name} is empty'
    names = [name for name, _ in columns]
    assert len(names) == len(set(names)), f'{list_name} has duplicate column names'
    bad = {col_type for _, col_type in columns} - VALID_GLUE_TYPES
    assert not bad, f'{list_name} has invalid glue types: {bad}'
