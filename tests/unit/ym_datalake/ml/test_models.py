"""Quantile regressors (XGBoost / HGB / Torch MLP) + health scorer + registry + race."""

from __future__ import annotations

import numpy as np
import pytest

from tests.unit.ym_datalake.ml.conftest import START, make_series
from ym_datalake.ml import registry
from ym_datalake.ml.models import ARCHITECTURES
from ym_datalake.ml.models.hgb import HGBQuantile
from ym_datalake.ml.models.iforest import HealthScorer
from ym_datalake.ml.models.linear import LinearQuantile
from ym_datalake.ml.models.nn import TorchQuantile
from ym_datalake.ml.models.rf import RFQuantile
from ym_datalake.ml.models.xgb import XGBQuantile

_SMALL = {'n_estimators': 40, 'max_depth': 3}
_SMALL_BY_ARCH = {
    XGBQuantile: _SMALL,
    HGBQuantile: {'max_iter': 40, 'max_depth': 3},
    RFQuantile: {'n_estimators': 60},
    LinearQuantile: {},
    TorchQuantile: {'epochs': 40},
}


def _toy(n=600, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(0, 10, size=(n, 3))
    y = 2.0 * x[:, 0] + rng.normal(0, 1.0, n)
    return x, y


def test_xgb_quantiles_are_monotone_and_ordered():
    x, y = _toy()
    model = XGBQuantile(seed=42, **_SMALL).fit(x, y)
    q = model.predict_quantiles(x[:50])
    assert q.shape == (50, 3)
    assert (q[:, 0] <= q[:, 1]).all() and (q[:, 1] <= q[:, 2]).all()
    assert np.mean((y[:50] >= q[:, 0]) & (y[:50] <= q[:, 2])) > 0.5


def test_xgb_ignores_nan_labels():
    x, y = _toy()
    y[::3] = np.nan
    model = XGBQuantile(seed=42, **_SMALL).fit(x, y)
    assert np.isfinite(model.predict_quantiles(x[:10])).all()


@pytest.mark.parametrize('cls', list(ARCHITECTURES.values()), ids=list(ARCHITECTURES))
def test_every_arch_fits_and_roundtrips(cls, tmp_path):
    x, y = _toy()
    model = cls(seed=42, **_SMALL_BY_ARCH[cls]).fit(x, y)
    q = model.predict_quantiles(x[:50])
    assert q.shape == (50, 3)
    assert (q[:, 0] <= q[:, 1]).all() and (q[:, 1] <= q[:, 2]).all()
    model.save(tmp_path / 'm')
    reloaded = cls.load(tmp_path / 'm')
    np.testing.assert_allclose(model.predict_quantiles(x[:20]), reloaded.predict_quantiles(x[:20]), rtol=1e-5)


@pytest.mark.parametrize(
    'cls', [HGBQuantile, RFQuantile, LinearQuantile, TorchQuantile], ids=['hgb', 'rf', 'linear', 'torch_mlp']
)
def test_challengers_handle_nan_features(cls):
    x, y = _toy()
    x[::4, 1] = np.nan
    model = cls(seed=42, **_SMALL_BY_ARCH[cls]).fit(x, y)
    assert np.isfinite(model.predict_quantiles(x[:20])).all()


def test_pick_champion_prefers_gate_passers():
    from ym_datalake.ml.__main__ import _pick_champion

    class _R:
        def __init__(self, gate, mae):
            self._gate, self._mae = gate, mae

        def passes_gate(self):
            return self._gate

        def mean_rmse(self):
            return self._mae

    assert _pick_champion({'a': _R(True, 2.0), 'b': _R(False, 1.0)}) == 'a'  # gate beats raw MAE
    assert _pick_champion({'a': _R(True, 2.0), 'b': _R(True, 1.0)}) == 'b'
    assert _pick_champion({'a': _R(False, 2.0), 'b': _R(False, 1.0)}) == 'b'  # fallback: best overall


def test_registry_champion_and_dim_rows(tmp_path):
    x, y = _toy()
    model = XGBQuantile(seed=42, **_SMALL).fit(x, y)
    mid = registry.save_model(
        tmp_path, model, 'speed_loss', ['a', 'b', 'c'], START, START, seed=42, report=None, is_champion=True
    )
    loaded, meta = registry.load_champion(tmp_path, 'speed_loss')
    assert meta['model_id'] == mid
    np.testing.assert_allclose(model.predict_quantiles(x[:5]), loaded.predict_quantiles(x[:5]))
    rows = registry.dim_rows(tmp_path)
    assert [r['model_id'] for r in rows] == [mid]
    assert rows[0]['is_champion'] and rows[0]['target'] == 'speed_loss'


def test_health_scorer_flags_anomalous_days():
    normal = make_series(n_days=200)
    scorer = HealthScorer(seed=42, n_estimators=100).fit([normal])
    spiky = make_series(n_days=200, anomaly_days=(180, 185, 190))
    scores = scorer.daily_scores(spiky)
    assert np.nanmin(scores) >= 0.0 and np.nanmax(scores) <= 1.0
    bad = np.nanmean(scores[[180, 185, 190]])
    good = np.nanmean(scores[100:150])
    assert bad < good
    assert 0.0 <= scorer.health_at_end(normal) <= 1.0
