"""Fold selection + writing on a tiny synthetic frame (never the 35MB real file)."""

from __future__ import annotations

import pandas as pd
import pytest

from ym_datalake.ml_york.evaluation import folds

# A leakage column and a predict-safe column that must behave oppositely under masking.
_LEAKAGE = ['HORSE_POWER', 'TOTAL_CONSUMP']
MANIFEST = {
    'target_columns': ['target_fuel_type', 'target_me_fs_consump', 'target_energy_mj'],
    'leakage_columns': _LEAKAGE + folds.FUEL_COLS,
}


def _row(ship, day, fuel_amounts, *, masked=False, steady=True, fuel_type, target='', energy=''):
    """One synthetic feature row; ``fuel_amounts`` maps a subset of FUEL_COLS to their MT strings."""
    row = {
        'ship_id': ship,
        'noon_utc': day,
        'is_masked': 'True' if masked else 'False',
        'is_predict': 'True' if masked else 'False',
        'is_steady_state': 'True' if steady else 'False',
        'target_fuel_type': fuel_type,
        'target_me_fs_consump': target,
        'target_energy_mj': energy,
        'HORSE_POWER': '5000',
        'TOTAL_CONSUMP': '42',
    }
    for col in folds.FUEL_COLS:
        row[col] = fuel_amounts.get(col, '0')
    row['stw'] = '12.5'  # a predict-safe feature: survives masking
    return row


HSHFO, VLSFO, LSMGO = (folds.FUEL_COLS[0], folds.FUEL_COLS[2], folds.FUEL_COLS[3])


@pytest.fixture
def frame():
    rows = [
        _row('S1', '0', {HSHFO: '100'}, fuel_type='HSHFO', target='100', energy='4020'),  # dup key ↓ dropped
        _row('S1', '1', {VLSFO: '200'}, fuel_type='VLSFO', target='200', energy='8040'),  # eligible
        _row('S2', '0', {HSHFO: '150'}, fuel_type='HSHFO', target='150', energy='6030'),  # eligible
        _row('S2', '1', {LSMGO: '50'}, fuel_type='LSMGO', target='50', energy='2135'),  # eligible
        _row('S3', '0', {HSHFO: '120'}, fuel_type='HSHFO', target='120', energy='4824'),  # eligible
        _row('S4', '0', {HSHFO: '10', VLSFO: '20'}, fuel_type='HSHFO', target='30'),  # multi-fuel: excluded
        _row('S5', '0', {HSHFO: '90'}, masked=True, fuel_type='HSHFO'),  # masked: excluded
        _row('S1', '0', {HSHFO: '999'}, fuel_type='HSHFO', target='999'),  # dup of row 0 key: both dropped
        _row(
            'S6', '0', {HSHFO: '80'}, steady=False, fuel_type='HSHFO', target='80', energy='3216'
        ),  # non-steady: excluded
    ]
    return pd.DataFrame(rows)


def test_eligible_is_labelled_single_fuel_unique_only(frame):
    keys = {(r['ship'], r['day'], r['fuel']) for r in folds.select_eligible(frame)}
    assert keys == {('S1', '1', 'VLSFO'), ('S2', '0', 'HSHFO'), ('S2', '1', 'LSMGO'), ('S3', '0', 'HSHFO')}
    # (S1,0,HSHFO) is non-unique → both copies dropped; S4 multi-fuel, S5 masked, S6 non-steady excluded.
    assert ('S1', '0', 'HSHFO') not in keys
    assert ('S6', '0', 'HSHFO') not in keys  # non-steady-state row is held out of the eval population


def test_folds_disjoint_and_cover_eligible(frame):
    eligible = folds.select_eligible(frame)
    fold_rows = folds.assign_folds(eligible, n=2, seed=0)
    idxs = [r['row_idx'] for fold in fold_rows for r in fold]
    assert len(idxs) == len(set(idxs))  # disjoint
    assert sorted(idxs) == sorted(r['row_idx'] for r in eligible)  # cover exactly the eligible set


def test_assign_folds_by_ship_one_ship_per_fold(frame):
    eligible = folds.select_eligible(frame)  # ships: S1 (1 row), S2 (2 rows), S3 (1 row)
    fold_rows = folds.assign_folds_by_ship(eligible, seed=0)

    assert len(fold_rows) == 3  # one fold per distinct eligible ship
    for fold in fold_rows:
        assert len({r['ship'] for r in fold}) == 1  # each fold is a single whole ship
    assert {fold[0]['ship'] for fold in fold_rows} == {'S1', 'S2', 'S3'}  # ships disjoint + fully covered

    idxs = [r['row_idx'] for fold in fold_rows for r in fold]
    assert len(idxs) == len(set(idxs))  # disjoint rows
    assert sorted(idxs) == sorted(r['row_idx'] for r in eligible)  # cover the eligible set exactly


def test_eval_csv_masks_targets_and_leakage_keeps_fuel_type(frame, tmp_path):
    eligible = folds.select_eligible(frame)
    fold_rows = folds.assign_folds(eligible, n=1, seed=0)[0]
    folds.write_fold(frame, MANIFEST, fold_rows, str(tmp_path / '1'))

    assert (tmp_path / '1' / 'eval.csv').is_file() and (tmp_path / '1' / 'train.csv').is_file()
    ev = pd.read_csv(tmp_path / '1' / 'eval.csv', dtype=str, keep_default_na=False)

    assert list(ev.columns) == list(frame.columns)  # all cols preserved, in order
    for col in ['target_me_fs_consump', 'target_energy_mj', *MANIFEST['leakage_columns']]:
        assert (ev[col] == '').all(), col  # target + leakage blanked
    assert (ev['is_predict'] == 'True').all() and (ev['is_masked'] == 'True').all()
    assert (ev['target_fuel_type'] != '').all()  # fuel identity is given on a predict row
    assert (ev['stw'] != '').all()  # predict-safe feature survives


def test_train_csv_is_complement_with_targets_intact(frame, tmp_path):
    eligible = folds.select_eligible(frame)
    fold_rows = folds.assign_folds(eligible, n=2, seed=0)[0]
    folds.write_fold(frame, MANIFEST, fold_rows, str(tmp_path / '1'))

    tr = pd.read_csv(tmp_path / '1' / 'train.csv', dtype=str, keep_default_na=False)
    assert len(tr) == len(frame) - len(fold_rows)

    fold_idx = {r['row_idx'] for r in fold_rows}
    kept_eligible = [r for r in eligible if r['row_idx'] not in fold_idx]
    # the other fold's eligible rows keep their labels (matched by ship/day after the index reset)...
    for r in kept_eligible:
        match = tr[(tr['ship_id'] == r['ship']) & (tr['noon_utc'] == r['day'])]
        assert len(match) == 1 and (match['target_me_fs_consump'] != '').all()
    assert (tr['ME_FULLSPEED_CONSUMP_HSHFO'] == '10').any()  # ...and the multi-fuel row keeps its raw fuel cells
