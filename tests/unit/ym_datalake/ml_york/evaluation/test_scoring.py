"""Metric math + key matching on toy arrays (hand-calculable, no real file)."""

from __future__ import annotations

import pandas as pd
import pytest

from ym_datalake.ml_york.evaluation import scoring

EXPECTED = [('S1', '0', 'HSHFO'), ('S1', '1', 'VLSFO'), ('S2', '0', 'LSMGO')]
TRUTH = {('S1', '0', 'HSHFO'): 100.0, ('S1', '1', 'VLSFO'): 200.0, ('S2', '0', 'LSMGO'): 50.0}


def test_perfect_answers_score_precision_one():
    m = scoring.fold_metrics(EXPECTED, TRUTH, dict(TRUTH), tol=0.05)
    assert m['precision'] == 1.0
    assert m['mae'] == 0.0 and m['rmse'] == 0.0 and m['mape'] == 0.0
    assert m['one_minus_mape'] == 1.0
    assert m['n'] == 3 and m['n_missing'] == 0


def test_jittered_answers_match_hand_calc():
    answers = {
        ('S1', '0', 'HSHFO'): 110.0,  # 10% off → outside tol
        ('S1', '1', 'VLSFO'): 200.0,  # exact
        ('S2', '0', 'LSMGO'): 51.0,  # 2% off → within tol
    }
    m = scoring.fold_metrics(EXPECTED, TRUTH, answers, tol=0.05)
    assert m['precision'] == pytest.approx(2 / 3)  # VLSFO + LSMGO within tol, HSHFO not
    assert m['mae'] == pytest.approx((10 + 0 + 1) / 3)
    assert m['rmse'] == pytest.approx(((100 + 0 + 1) / 3) ** 0.5)
    assert m['mape'] == pytest.approx((0.10 + 0.0 + 0.02) / 3)
    assert m['one_minus_mape'] == pytest.approx(1 - 0.04)


def test_missing_answer_counts_incorrect_and_warns():
    answers = {('S1', '0', 'HSHFO'): 100.0, ('S1', '1', 'VLSFO'): 200.0}  # LSMGO cell unanswered
    with pytest.warns(UserWarning, match='missing answer'):
        m = scoring.fold_metrics(EXPECTED, TRUTH, answers, tol=0.05)
    assert m['n'] == 3 and m['n_missing'] == 1
    assert m['precision'] == pytest.approx(2 / 3)  # miss drags precision down
    assert m['mae'] == 0.0  # error metrics span the two answered (exact) cells only


def test_load_answers_normalizes_full_and_short_fuel_names(tmp_path):
    path = tmp_path / 'answer.csv'
    path.write_text(
        'ship_id,day,fuel_type,predicted_value\n'
        'S1,0,ME_FULLSPEED_CONSUMP_HSHFO,100\n'  # full column name
        'S2,0,VLSFO,200\n'  # already short
    )
    assert scoring.load_answers(str(path)) == {('S1', '0', 'HSHFO'): 100.0, ('S2', '0', 'VLSFO'): 200.0}


def test_build_truth_excludes_masked_and_expected_cells_read_predict_rows():
    df = pd.DataFrame(
        {
            'ship_id': ['S1', 'S2', 'S9'],
            'noon_utc': ['0', '1', '0'],
            'is_masked': ['False', 'False', 'True'],
            'is_predict': ['False', 'False', 'True'],
            'target_fuel_type': ['HSHFO', 'VLSFO', 'HSHFO'],
            'target_me_fs_consump': ['100', '200', ''],
        }
    )
    assert scoring.build_truth(df) == {('S1', '0', 'HSHFO'): 100.0, ('S2', '1', 'VLSFO'): 200.0}
    assert scoring.expected_cells(df) == [('S9', '0', 'HSHFO')]  # only the is_predict row
