"""Per-model smoke tests on a tiny synthetic frame — every comparison family fits, predicts, ranks.

Each model's ``train_model`` must fit on the steady single-fuel rows (NaN feature cells included, so the
median-imputing pipelines and the native-NaN boosters are both exercised), its fitted estimator must
predict finite values, ``common.predict_cells`` must reconstruct positive MT, and ``native_importance``
must return a feature-indexed Series (or ``None`` for HistGBR). Real-data integration is covered by the
``model.compare`` run, not here.
"""

from __future__ import annotations

import importlib

import numpy as np
import pandas as pd
import pytest

from ym_datalake.ml_york.evaluation import folds
from ym_datalake.ml_york.model import common

MODELS = ['lightgbm', 'random_forest', 'extra_trees', 'hist_gbdt', 'elasticnet']
NATIVE_NONE = {'hist_gbdt'}  # HistGBR exposes no impurity importance
FEATURES = ['stw', 'rpm']
HSHFO = folds.FUEL_COLS[0]


def _base_row(ship, day, *, stw, rpm, target, predict):
    row = {
        'ship_id': ship,
        'noon_utc': day,
        'is_masked': 'True' if predict else 'False',
        'is_predict': 'True' if predict else 'False',
        'is_steady_state': 'True',
        'target_fuel_type': 'HSHFO',
        'target_energy_mj_per_hour': '' if predict else f'{target:.4f}',
        'hours_full_speed': '20.0',
        'fuel_lcv': '40.2',
        'stw': stw,
        'rpm': rpm,
    }
    for col in folds.FUEL_COLS:
        row[col] = '0'
    row[HSHFO] = '' if predict else '100'  # predict rows have blanked raw fuels
    return row


def _train_frame(n=60):
    """``n`` eligible steady single-fuel rows with signal, some feature cells blanked (-> NaN)."""
    rows = []
    for i in range(n):
        stw = 8.0 + (i % 10) * 0.5
        rpm = 40.0 + (i % 7) * 3.0
        target = 50.0 + stw * 4.0 + rpm * 0.5  # positive, varying, learnable
        stw_s = '' if i % 13 == 0 else f'{stw:.3f}'  # inject NaN feature cells
        rpm_s = '' if i % 17 == 0 else f'{rpm:.3f}'
        rows.append(_base_row(f'S{i % 6}', str(i), stw=stw_s, rpm=rpm_s, target=target, predict=False))
    return pd.DataFrame(rows)


def _predict_frame():
    rows = [
        _base_row('S21', '450', stw='11.0', rpm='55.0', target=0.0, predict=True),
        _base_row('S22', '451', stw='', rpm='48.0', target=0.0, predict=True),  # NaN feature on a predict row
    ]
    return pd.DataFrame(rows)


@pytest.mark.parametrize('name', MODELS)
def test_model_fits_predicts_and_ranks(name):
    mod = importlib.import_module(f'ym_datalake.ml_york.model.{name}')
    frame = _train_frame()

    fitted = mod.train_model(frame, FEATURES, seed=42)

    # predict works on the (NaN-bearing) feature matrix the model trained on
    x, _, mask = common.build_xy(frame, FEATURES)
    preds = fitted.predict(x.loc[mask])
    assert len(preds) == int(mask.sum())
    assert np.isfinite(preds).all()

    # end-to-end MT reconstruction with the real fitted model (incl. a NaN feature on a predict row)
    out = common.predict_cells(fitted, _predict_frame(), FEATURES)
    assert len(out) == 2
    assert (out['predicted_value'] > 0).all() and np.isfinite(out['predicted_value']).all()

    imp = mod.native_importance(fitted, FEATURES)
    if name in NATIVE_NONE:
        assert imp is None
    else:
        assert isinstance(imp, pd.Series)
        assert set(imp.index) == set(FEATURES)
