"""Local model registry — ``<models_dir>/<model_id>/`` (doc/ml-pipeline-zh.md §6.3).

Each saved model directory holds the architecture's own artifact files plus a
``meta.json`` (id, type, target, train window, seed, backtest metrics,
champion flag). ``dim_rows`` flattens every ``meta.json`` into
``dim_ml_model`` rows so Athena can trace any prediction back to its model.

Determinism note: ``trained_at`` is the **training-data end date**, not wall
clock, so re-running on the same inputs reproduces byte-identical outputs.
"""

from __future__ import annotations

import datetime as dt
import json
import pickle
from pathlib import Path

from ym_datalake.ml.backtest import BacktestReport
from ym_datalake.ml.models.hgb import HGBQuantile
from ym_datalake.ml.models.linear import LinearQuantile
from ym_datalake.ml.models.nn import TorchQuantile
from ym_datalake.ml.models.rf import RFQuantile
from ym_datalake.ml.models.xgb import XGBQuantile

_ARCH_LOADERS = {
    'xgboost': XGBQuantile.load,
    'hgb': HGBQuantile.load,
    'random_forest': RFQuantile.load,
    'linear': LinearQuantile.load,
    'torch_mlp': TorchQuantile.load,
}


def model_id(target: str, model_type: str, train_end: dt.date, seed: int) -> str:
    return f'{target}-{model_type}-{train_end:%Y%m%d}-s{seed}'


def save_model(
    models_dir: str | Path,
    model,
    target: str,
    feature_names: list[str],
    train_start: dt.date,
    train_end: dt.date,
    seed: int,
    report: BacktestReport | None,
    is_champion: bool,
) -> str:
    """Persist one fitted model + metadata; return its ``model_id``."""
    mid = model_id(target, model.model_type, train_end, seed)
    out = Path(models_dir) / mid
    model.save(out)
    meta = {
        'model_id': mid,
        'model_type': model.model_type,
        'target': target,
        'trained_at': train_end.isoformat(),
        'train_start': train_start.isoformat(),
        'train_end': train_end.isoformat(),
        'seed': seed,
        'n_features': len(feature_names),
        'feature_names': feature_names,
        'is_champion': is_champion,
        'backtest': None
        if report is None
        else {
            'n_folds': report.n_folds,
            'rmse': report.rmse,
            'baseline_rmse': report.baseline_rmse,
            'coverage': report.coverage,
            'n': report.n,
            'passes_gate': report.passes_gate(),
        },
    }
    (out / 'meta.json').write_text(json.dumps(meta, indent=2))
    return mid


def save_health(models_dir: str | Path, scorer, train_start: dt.date, train_end: dt.date, seed: int) -> str:
    """Persist the pickled IsolationForest health scorer + registry metadata."""
    mid = model_id('health', scorer.model_type, train_end, seed)
    out = Path(models_dir) / mid
    out.mkdir(parents=True, exist_ok=True)
    (out / 'model.pkl').write_bytes(pickle.dumps(scorer))
    meta = {
        'model_id': mid,
        'model_type': scorer.model_type,
        'target': 'health',
        'trained_at': train_end.isoformat(),
        'train_start': train_start.isoformat(),
        'train_end': train_end.isoformat(),
        'seed': seed,
        'n_features': 4,
        'feature_names': ['sl_z', 'slip_z', 'sfoc_z', 'adm_z'],
        'is_champion': True,
        'backtest': None,
    }
    (out / 'meta.json').write_text(json.dumps(meta, indent=2))
    return mid


def _metas(models_dir: str | Path) -> list[dict]:
    root = Path(models_dir)
    metas = []
    if root.is_dir():
        for meta_path in sorted(root.glob('*/meta.json')):
            metas.append(json.loads(meta_path.read_text()))
    return metas


def load_champion(models_dir: str | Path, target: str):
    """Load the newest champion model for ``target`` (raises if none saved)."""
    champs = [m for m in _metas(models_dir) if m['target'] == target and m['is_champion']]
    if not champs:
        raise FileNotFoundError(f'no champion model for target {target!r} under {models_dir!r} — run train first')
    meta = max(champs, key=lambda m: m['train_end'])
    model_dir = Path(models_dir) / meta['model_id']
    if meta['model_type'] in _ARCH_LOADERS:
        return _ARCH_LOADERS[meta['model_type']](model_dir), meta
    return pickle.loads((model_dir / 'model.pkl').read_bytes()), meta


def dim_rows(models_dir: str | Path) -> list[dict]:
    """Flatten every saved model's metadata into ``dim_ml_model`` rows."""
    rows = []
    for m in _metas(models_dir):
        bt = m.get('backtest') or {}
        rmse, base = bt.get('rmse', {}), bt.get('baseline_rmse', {})
        rows.append(
            {
                'model_id': m['model_id'],
                'model_type': m['model_type'],
                'target': m['target'],
                'trained_at': m['trained_at'],
                'train_start': m['train_start'],
                'train_end': m['train_end'],
                'seed': m['seed'],
                'n_features': m['n_features'],
                'is_champion': m['is_champion'],
                'passes_gate': bt.get('passes_gate'),
                'rmse_h7': rmse.get('h7'),
                'rmse_h30': rmse.get('h30'),
                'rmse_h90': rmse.get('h90'),
                'baseline_rmse_h7': min(base['h7'].values()) if 'h7' in base else None,
                'baseline_rmse_h30': min(base['h30'].values()) if 'h30' in base else None,
                'baseline_rmse_h90': min(base['h90'].values()) if 'h90' in base else None,
            }
        )
    return rows
