"""Feature layer — causality, label alignment, reset exclusion."""

from __future__ import annotations

import datetime as dt

import numpy as np
import pytest

from tests.unit.ym_datalake.ml.conftest import START, make_series
from ym_datalake.ml.features import FEATURE_NAMES, build_inference_set, build_training_set


def test_labels_align_with_target_day(series):
    fs = build_training_set([series], horizons=(7, 30), stride=10)
    assert fs.X.shape[1] == len(FEATURE_NAMES)
    assert len(fs.meta) > 0
    sl_by_date = {r['report_date']: r['speed_loss_pct'] for r in series.rows}
    for k, meta in enumerate(fs.meta):
        assert (meta['target_date'] - meta['as_of']).days == meta['horizon_days']
        assert fs.y_sl[k] == pytest.approx(sl_by_date[meta['target_date'].isoformat()])
        assert fs.y_foc[k] == pytest.approx(100.0)


def test_features_are_causal(series):
    """Perturbing the future must not change features at an earlier as_of."""
    mutated = make_series()
    cut = START + dt.timedelta(days=150)
    for row in mutated.rows:
        if dt.date.fromisoformat(row['report_date']) > cut:
            row['speed_loss_pct'] = 25.0
            row['sfoc_g_kwh'] = 400.0
    fs_a = build_training_set([series], horizons=(7,), stride=10)
    fs_b = build_training_set([mutated], horizons=(7,), stride=10)
    for k, meta in enumerate(fs_a.meta):
        if meta['target_date'] > cut:
            continue
        np.testing.assert_allclose(fs_a.X[k], fs_b.X[k], err_msg=f'lookahead at as_of={meta["as_of"]}')


def test_reset_windows_are_excluded():
    series = make_series(reset_day=120)
    fs = build_training_set([series], horizons=(7, 30), stride=5)
    reset = START + dt.timedelta(days=120)
    for meta in fs.meta:
        assert not (meta['as_of'] < reset <= meta['target_date'])


def test_days_since_cleaning_target_advances_with_horizon(series):
    fs = build_training_set([series], horizons=(7, 30), stride=30)
    dsc = fs.column('days_since_cleaning')
    dsc_target = fs.column('days_since_cleaning_target')
    h = fs.column('horizon_days')
    np.testing.assert_allclose(dsc_target, dsc + h)


def test_inference_set_covers_every_horizon(series):
    fs = build_inference_set(series)
    assert [m['horizon_days'] for m in fs.meta] == list(range(1, 91))
    as_of = series.dates[-1]
    assert all(m['as_of'] == as_of for m in fs.meta)
    assert fs.meta[-1]['target_date'] == as_of + dt.timedelta(days=90)
    assert np.isfinite(fs.X[:, : len(FEATURE_NAMES)]).all(axis=1).any()
