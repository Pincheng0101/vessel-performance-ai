"""Model-agnostic core tests on tiny synthetic frames — no real training, no 40 MB file.

Ported from ``model/xgboost/test_model.py`` against :mod:`model.common` (the two hold logically identical
``build_xy``/``predict_cells``). Covers the leakage-free training-row mask, the log target, NaN
passthrough, and the MT reconstruction round-trip + predict-row filtering.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ym_datalake.ml_york.evaluation import folds
from ym_datalake.ml_york.model import common

FEATURES = ['stw', 'rpm']
HSHFO, VLSFO = folds.FUEL_COLS[0], folds.FUEL_COLS[2]


def _row(
    ship,
    day,
    *,
    steady,
    fuels,
    target_ephr,
    fuel_type='HSHFO',
    predict=False,
    hours='20.0',
    lcv='40.2',
    stw='12.5',
    rpm='60.0',
):
    """One synthetic feature row as strings, exactly as ``folds.load_features`` (dtype=str) yields."""
    row = {
        'ship_id': ship,
        'noon_utc': day,
        'is_masked': 'True' if predict else 'False',
        'is_predict': 'True' if predict else 'False',
        'is_steady_state': 'True' if steady else 'False',
        'target_fuel_type': fuel_type,
        'target_energy_mj_per_hour': target_ephr,
        'hours_full_speed': hours,
        'fuel_lcv': lcv,
        'stw': stw,
        'rpm': rpm,
    }
    for col in folds.FUEL_COLS:
        row[col] = fuels.get(col, '0')
    return row


@pytest.fixture
def train_frame():
    rows = [
        _row('S1', '0', steady=True, fuels={HSHFO: '100'}, target_ephr='90'),  # eligible
        _row('S1', '1', steady=False, fuels={HSHFO: '100'}, target_ephr='90'),  # not steady -> excluded
        _row('S2', '0', steady=True, fuels={HSHFO: '10', VLSFO: '20'}, target_ephr='90'),  # multi-fuel -> excluded
        _row('S2', '1', steady=True, fuels={HSHFO: '100'}, target_ephr='0'),  # t<=0 -> excluded
        _row('S3', '0', steady=True, fuels={HSHFO: '100'}, target_ephr='-5'),  # t<0 -> excluded
        # steady + single-fuel + looks labelled, but masked so its target is blanked -> excluded (no leakage):
        _row('S9', '9', steady=True, fuels={HSHFO: '100'}, target_ephr='', predict=True),
    ]
    return pd.DataFrame(rows)


def test_mask_selects_only_steady_single_fuel_positive_rows(train_frame):
    _, _, mask = common.build_xy(train_frame, FEATURES)
    assert mask.tolist() == [True, False, False, False, False, False]


def test_masked_predict_row_excluded_even_though_steady_single_fuel(train_frame):
    # The last row is steady + single-fuel but is_predict/is_masked with a blanked target: the NaN-target
    # filter must drop it, or a real PREDICT cell's truth would leak into training.
    _, _, mask = common.build_xy(train_frame, FEATURES)
    assert not bool(mask.iloc[-1])


def test_y_is_log_of_target_on_kept_rows(train_frame):
    _, y, _ = common.build_xy(train_frame, FEATURES)
    assert np.isclose(y.iloc[0], np.log(90.0))
    assert np.isnan(y.iloc[3])  # target 0 -> NaN, never -inf


def test_x_is_float_matrix_with_feature_columns(train_frame):
    x, _, _ = common.build_xy(train_frame, FEATURES)
    assert list(x.columns) == FEATURES
    assert x['stw'].dtype == float and np.isclose(x['stw'].iloc[0], 12.5)


def test_x_passes_nan_through_for_the_model_to_handle():
    # A blank feature cell must arrive as NaN (native-NaN models split on it; imputers fill it) — not 0.
    frame = pd.DataFrame([_row('S1', '0', steady=True, fuels={HSHFO: '100'}, target_ephr='90', stw='')])
    x, _, _ = common.build_xy(frame, FEATURES)
    assert np.isnan(x['stw'].iloc[0])


class _DummyModel:
    """Returns fixed ``log(energy_per_hour)`` values so the MT reconstruction is exactly checkable."""

    def __init__(self, log_preds):
        self._log_preds = np.asarray(log_preds, dtype=float)

    def predict(self, x):
        assert list(x.columns) == FEATURES  # predict_cells must hand the model the feature matrix
        return self._log_preds


def test_reconstruction_roundtrip_recovers_mt():
    # mass = exp(log_ephr) * hours / lcv. Choose energy_per_hour so mass comes back to a known MT value.
    # target mass 100 MT, hours 20, lcv 40.2 -> energy_per_hour = 100*40.2/20 = 201.0
    eval_df = pd.DataFrame(
        [
            _row('S21', '450', steady=True, fuels={}, target_ephr='', predict=True, hours='20.0', lcv='40.2'),
            _row(
                'S22',
                '600',
                steady=True,
                fuels={},
                target_ephr='',
                predict=True,
                hours='24.0',
                lcv='42.7',
                fuel_type='LSMGO',
            ),
        ]
    )
    dummy = _DummyModel([np.log(201.0), np.log(50.0 * 42.7 / 24.0)])
    out = common.predict_cells(dummy, eval_df, FEATURES)

    assert np.isclose(out['predicted_value'].iloc[0], 100.0)
    assert np.isclose(out['predicted_value'].iloc[1], 50.0)


def test_output_header_and_fuel_type_and_day_verbatim():
    eval_df = pd.DataFrame([_row('S21', '450', steady=True, fuels={}, target_ephr='', predict=True, fuel_type='HSHFO')])
    out = common.predict_cells(_DummyModel([np.log(200.0)]), eval_df, FEATURES)

    assert list(out.columns) == ['ship_id', 'day', 'fuel_type', 'predicted_value']
    assert out['fuel_type'].iloc[0] == 'ME_FULLSPEED_CONSUMP_HSHFO'
    assert out['day'].iloc[0] == '450'  # noon_utc emitted verbatim
    assert (out['predicted_value'] > 0).all()


def test_predict_cells_only_answers_predict_rows():
    eval_df = pd.DataFrame(
        [
            _row('S21', '450', steady=True, fuels={}, target_ephr='', predict=True),
            _row('S1', '0', steady=True, fuels={HSHFO: '100'}, target_ephr='90', predict=False),  # not a predict row
            _row('S21', '451', steady=True, fuels={}, target_ephr='', predict=True),
        ]
    )
    out = common.predict_cells(_DummyModel([np.log(200.0), np.log(210.0)]), eval_df, FEATURES)
    assert len(out) == 2
    assert out['day'].tolist() == ['450', '451']
