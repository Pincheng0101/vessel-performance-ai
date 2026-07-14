"""Real-dataset loader tests — CSV -> typed rows -> partitioned JSONL tree."""

import json
from pathlib import Path

from table.real_data import MAINTENANCE_COLUMNS
from ym_datalake.etl.real_data import load_maintenance, load_vt_fd, write_real_data

DATA_DIR = Path(__file__).resolve().parents[4] / 'data'

VT_FD_HEADER = (
    'De-identification Name,VOYAGE,NOON_UTC,AVG_SPEED,SPEED_THROUGH_WATER,ME_AVG_RPM,PROPELLER_SPEED,'
    'FORE_DRAFT,AFTER_DRAFT,DISPLACEMENT,CARGO_ON_BOARD,WIND_SCALE,SEA_HEIGHT,SEA_WATER_TEMP,WIND_SPEED,'
    'WIND_DIRECTION,SWELL_HEIGHT,SWELL_DIRECTION,SEA_DIRECTION,WATER_DEPTH,MID_DRAFT,TOTAL_DISTANCE,'
    'SEA_SPEED_DISTANCE,DIFF_STW_SOG_SLIP,FULL_SPD_STW_SLIP,HORSE_POWER,LOAD_PCT,SFOC,ME_SLIP,THRUST,'
    'THRUST_QUOTIENT,TOTAL_CONSUMP,ME_CONSUMPTION,ME_FULLSPEED_CONSUMP_HSHFO,ME_FULLSPEED_CONSUMP_ULSFO,'
    'ME_FULLSPEED_CONSUMP_VLSFO,ME_FULLSPEED_CONSUMP_LSMGO,ME_FULLSPEED_CONSUMP_BIO_HSFO,'
    'HOURS_FULL_SPEED,HOURS_TOTAL'
)


def _vt_fd_csv(tmp_path, *rows: str) -> Path:
    path = tmp_path / 'vt_fd.csv'
    path.write_text('\n'.join([VT_FD_HEADER, *rows]) + '\n', encoding='utf-8')
    return path


_PLAIN_ROW = (
    'S1,28,3,14.4,14.68,51.8,16.61,14.9,15.0,,91791.0,3.0,,,,12.0,,,,20.0,,329.0,317.0,,,'
    '13295.0,,,13.23,0.0,,66.05,,0.0,0.0,51.09,0.0,,22.0,24.0'
)
_PREDICT_ROW = (
    'S21,5,450,15.1,15.3,60.2,19.0,13.0,13.5,80000.0,70000.0,2.0,1.1,20.5,8.0,4.0,0.8,3.0,3.0,50.0,13.2,'
    '350.0,340.0,0.2,2.1,HIDDEN,HIDDEN,HIDDEN,HIDDEN,HIDDEN,HIDDEN,HIDDEN,HIDDEN,PREDICT,HIDDEN,HIDDEN,'
    'HIDDEN,HIDDEN,23.0,24.0'
)


def test_load_vt_fd_plain_row(tmp_path):
    rows = load_vt_fd(_vt_fd_csv(tmp_path, _PLAIN_ROW))
    assert len(rows) == 1
    r = rows[0]
    assert r['ship_id'] == 'S1'
    assert r['voyage'] == '28'
    assert r['noon_utc'] == 3
    assert isinstance(r['noon_utc'], int)
    assert r['avg_speed'] == 14.4
    assert r['displacement'] is None  # empty cell
    assert r['me_fullspeed_consump_vlsfo'] == 51.09
    assert r['masked_flag'] is False
    assert r['predict_fuel_type'] is None


def test_load_vt_fd_markers(tmp_path):
    r = load_vt_fd(_vt_fd_csv(tmp_path, _PREDICT_ROW))[0]
    assert r['masked_flag'] is True
    # PREDICT cell -> null + fuel column name recorded in submission (uppercase) form.
    assert r['predict_fuel_type'] == 'ME_FULLSPEED_CONSUMP_HSHFO'
    assert r['me_fullspeed_consump_hshfo'] is None
    assert r['horse_power'] is None  # HIDDEN -> null
    assert r['hours_full_speed'] == 23.0  # visible columns still typed


def test_load_real_csvs_end_to_end():
    vt_rows = load_vt_fd(DATA_DIR / 'vt_fd.csv')
    assert len(vt_rows) == 21282
    assert {r['ship_id'] for r in vt_rows} >= {'S1', 'S12', 'S21', 'S23'}
    predicts = [r['predict_fuel_type'] for r in vt_rows if r['predict_fuel_type']]
    assert len(predicts) == 102
    assert predicts.count('ME_FULLSPEED_CONSUMP_HSHFO') == 91
    assert predicts.count('ME_FULLSPEED_CONSUMP_VLSFO') == 11

    mnt_rows = load_maintenance(DATA_DIR / 'maintenance.csv')
    assert len(mnt_rows) == 77
    assert all(set(r) == {k for k, _ in MAINTENANCE_COLUMNS} for r in mnt_rows)


def test_load_maintenance_types_and_nulls(tmp_path):
    path = tmp_path / 'maintenance.csv'
    path.write_text(
        'ship_id,event_type,event_day,propeller_condition,hull_fouling_type,hull_coating_condition,'
        'cavitation_found,draft_fwd_m,draft_aft_m\n'
        'S1,DD,981,,,,,,\n'
        'S2,UWI+PP,1438,Good,"barnacle,slime",Fair,No,13.6,13.8\n',
        encoding='utf-8',
    )
    rows = load_maintenance(path)
    assert rows[0]['event_day'] == 981
    assert isinstance(rows[0]['event_day'], int)
    assert rows[0]['propeller_condition'] is None
    assert rows[0]['draft_fwd_m'] is None
    assert rows[1]['hull_fouling_type'] == 'barnacle,slime'
    assert rows[1]['draft_aft_m'] == 13.8


def test_write_real_data_partition_layout(tmp_path):
    vt_rows = load_vt_fd(_vt_fd_csv(tmp_path, _PLAIN_ROW, _PREDICT_ROW))
    mnt_rows = [dict.fromkeys((k for k, _ in MAINTENANCE_COLUMNS)) | {'ship_id': 'S1'}]

    counts = write_real_data(vt_rows, mnt_rows, tmp_path)

    assert counts == {'vt_fd': 2, 'maintenance': 1}
    s1 = tmp_path / 'raw' / 'vt_fd' / 'ship_id=S1' / 'data.jsonl'
    s21 = tmp_path / 'raw' / 'vt_fd' / 'ship_id=S21' / 'data.jsonl'
    mnt = tmp_path / 'raw' / 'maintenance' / 'maintenance.jsonl'
    assert s1.is_file() and s21.is_file() and mnt.is_file()

    record = json.loads(s21.read_text().splitlines()[0])
    assert record['masked_flag'] is True
    assert record['me_fullspeed_consump_hshfo'] is None
    # No placeholder strings survive into the JSONL.
    tree_text = s1.read_text() + s21.read_text() + mnt.read_text()
    assert 'HIDDEN' not in tree_text and 'PREDICT' not in tree_text
