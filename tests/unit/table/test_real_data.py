"""VT_FD_COLUMNS / MAINTENANCE_COLUMNS must mirror the real CSVs in data/."""

import csv
from pathlib import Path

from table.real_data import MAINTENANCE_COLUMNS, SHIP_IDS, VT_FD_COLUMNS

DATA_DIR = Path(__file__).resolve().parents[3] / 'data'

# vt_fd.csv header -> vt_fd column. 'De-identification Name' becomes the
# ship_id partition key (not a body column); the rest are lowercased 1:1.
VT_FD_HEADER_MAP = {
    'De-identification Name': 'ship_id',
    'VOYAGE': 'voyage',
    'NOON_UTC': 'noon_utc',
    'AVG_SPEED': 'avg_speed',
    'SPEED_THROUGH_WATER': 'speed_through_water',
    'ME_AVG_RPM': 'me_avg_rpm',
    'PROPELLER_SPEED': 'propeller_speed',
    'FORE_DRAFT': 'fore_draft',
    'AFTER_DRAFT': 'after_draft',
    'DISPLACEMENT': 'displacement',
    'CARGO_ON_BOARD': 'cargo_on_board',
    'WIND_SCALE': 'wind_scale',
    'SEA_HEIGHT': 'sea_height',
    'SEA_WATER_TEMP': 'sea_water_temp',
    'WIND_SPEED': 'wind_speed',
    'WIND_DIRECTION': 'wind_direction',
    'SWELL_HEIGHT': 'swell_height',
    'SWELL_DIRECTION': 'swell_direction',
    'SEA_DIRECTION': 'sea_direction',
    'WATER_DEPTH': 'water_depth',
    'MID_DRAFT': 'mid_draft',
    'TOTAL_DISTANCE': 'total_distance',
    'SEA_SPEED_DISTANCE': 'sea_speed_distance',
    'DIFF_STW_SOG_SLIP': 'diff_stw_sog_slip',
    'FULL_SPD_STW_SLIP': 'full_spd_stw_slip',
    'HORSE_POWER': 'horse_power',
    'LOAD_PCT': 'load_pct',
    'SFOC': 'sfoc',
    'ME_SLIP': 'me_slip',
    'THRUST': 'thrust',
    'THRUST_QUOTIENT': 'thrust_quotient',
    'TOTAL_CONSUMP': 'total_consump',
    'ME_CONSUMPTION': 'me_consumption',
    'ME_FULLSPEED_CONSUMP_HSHFO': 'me_fullspeed_consump_hshfo',
    'ME_FULLSPEED_CONSUMP_ULSFO': 'me_fullspeed_consump_ulsfo',
    'ME_FULLSPEED_CONSUMP_VLSFO': 'me_fullspeed_consump_vlsfo',
    'ME_FULLSPEED_CONSUMP_LSMGO': 'me_fullspeed_consump_lsmgo',
    'ME_FULLSPEED_CONSUMP_BIO_HSFO': 'me_fullspeed_consump_bio_hsfo',
    'HOURS_FULL_SPEED': 'hours_full_speed',
    'HOURS_TOTAL': 'hours_total',
}

# Loader-set columns without a CSV counterpart.
MARKER_COLUMNS = {'masked_flag', 'predict_fuel_type'}


def _header(csv_name: str) -> list[str]:
    with (DATA_DIR / csv_name).open() as f:
        return next(csv.reader(f))


def test_vt_fd_columns_cover_csv_header() -> None:
    header = _header('vt_fd.csv')
    assert set(header) == set(VT_FD_HEADER_MAP)

    expected_body = {VT_FD_HEADER_MAP[h] for h in header} - {'ship_id'} | MARKER_COLUMNS
    assert {name for name, _ in VT_FD_COLUMNS} == expected_body
    # ship_id is the partition key, never a body column.
    assert 'ship_id' not in {name for name, _ in VT_FD_COLUMNS}


def test_vt_fd_marker_column_types() -> None:
    types = dict(VT_FD_COLUMNS)
    assert types['masked_flag'] == 'boolean'
    assert types['predict_fuel_type'] == 'string'
    assert types['noon_utc'] == 'int'
    assert types['voyage'] == 'string'


def test_maintenance_columns_match_csv_header() -> None:
    header = _header('maintenance.csv')
    assert [name for name, _ in MAINTENANCE_COLUMNS] == header


def test_ship_ids_match_data() -> None:
    for csv_name, col in (('vt_fd.csv', 'De-identification Name'), ('maintenance.csv', 'ship_id')):
        with (DATA_DIR / csv_name).open() as f:
            assert {row[col] for row in csv.DictReader(f)} == set(SHIP_IDS)
    assert len(SHIP_IDS) == 15
