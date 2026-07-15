"""Model-agnostic orchestration for the ME full-speed fuel-consumption benchmark.

Every comparison model (LightGBM, RandomForest, ExtraTrees, HistGradientBoosting, ElasticNet) drives the
same target, harness, and folds as :mod:`model.xgboost`, so their metrics and feature importances are
apples-to-apples with the XGBoost submission. The model-independent pieces here — ``build_xy`` (log
per-hour target + steady single-fuel mask) and ``predict_cells`` (MT reconstruction, README columns) —
are a verbatim copy of :mod:`model.xgboost.model`; the two MUST stay logically identical, since the whole
point of the comparison is that only the estimator differs.

Orchestration is parameterized by a ``train_model`` callable with the exact XGBoost signature
``(train_df, features, seed=42) -> fitted estimator/Pipeline`` exposing ``.predict()``. That lets
:func:`evaluate_folds` / :func:`run_predict` drive XGBoost unmodified alongside every new family.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

from ym_datalake.ml_york.evaluation import folds, scoring

_FUEL_PREFIX = 'ME_FULLSPEED_CONSUMP_'
_METRICS = ['precision', 'one_minus_mape', 'mae', 'rmse', 'mape']

# ``(train_df, features, seed) -> fitted estimator`` — matches xgboost.model.train_model exactly.
TrainModel = Callable[..., Any]
# ``(fitted, features) -> pd.Series | None`` — native importance, ``None`` where the model exposes none.
NativeImportance = Callable[[Any, list[str]], 'pd.Series | None']


def _is_true(series: pd.Series) -> pd.Series:
    """String flag column (``'True'``/``'False'``) -> boolean, matching the harness's own comparison."""
    return series.astype(str).str.lower() == 'true'


def _numeric(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Coerce a column subset to float, preserving column identity/order (markers/blanks -> NaN)."""
    return df[columns].apply(pd.to_numeric, errors='coerce')


def steady_single_fuel(df: pd.DataFrame) -> pd.Series:
    """The README predict-day gate over training rows: steady-state AND exactly one positive raw fuel.

    Mirrors ``folds.select_eligible``'s single-fuel test. The raw fuel columns are used only to *select*
    rows, never as features. On masked/predict rows every raw fuel cell is blank, so the count is 0 and
    the row is excluded here too (belt-and-braces with the NaN-target filter in :func:`build_xy`).
    """
    steady = _is_true(df['is_steady_state'])
    fuel_num = _numeric(df, folds.FUEL_COLS)
    single_fuel = (fuel_num > 0).sum(axis=1) == 1
    return steady & single_fuel


def build_xy(
    df: pd.DataFrame, features: list[str], target: str = 'target_energy_mj_per_hour'
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """``(X, y, mask)``: feature matrix, ``log(target)``, and the trainable-row mask, all row-aligned.

    ``X`` is every ``features`` column coerced to float (NaN passed through for the model to handle).
    ``y = log(target)`` where the target is finite and positive, else NaN. ``mask`` selects the rows to
    fit on: steady single-fuel rows with a finite positive target. Non-positive targets (the zero-fuel
    ``log(0)`` rows) and masked/predict rows (NaN target) fall out of the mask -> no leakage into the
    102 cells.
    """
    t = pd.to_numeric(df[target], errors='coerce')
    x = _numeric(df, features)
    y = np.log(t.where(t > 0))  # t<=0 or NaN -> NaN (no -inf, no runtime warning)
    mask = steady_single_fuel(df) & np.isfinite(t) & (t > 0)
    return x, y, mask


def predict_cells(model: Any, eval_df: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    """Answer every ``is_predict`` row: reconstruct MT/day and emit README submission columns.

    Returns ``ship_id, day (=noon_utc verbatim), fuel_type (=ME_FULLSPEED_CONSUMP_<target_fuel_type>),
    predicted_value``. The estimator predicts ``log(energy_per_hour)``; MT/day is
    ``exp(pred) * hours_full_speed / fuel_lcv`` (both predict-safe, so the training LCV cancels).
    """
    predict = eval_df[_is_true(eval_df['is_predict'])].copy()
    x = _numeric(predict, features)

    energy_per_hour = np.exp(model.predict(x))
    hours = pd.to_numeric(predict['hours_full_speed'], errors='coerce').to_numpy()
    lcv = pd.to_numeric(predict['fuel_lcv'], errors='coerce').to_numpy()
    predicted_value = energy_per_hour * hours / lcv

    return pd.DataFrame(
        {
            'ship_id': predict['ship_id'].to_numpy(),
            'day': predict['noon_utc'].to_numpy(),
            'fuel_type': (_FUEL_PREFIX + predict['target_fuel_type'].astype(str)).to_numpy(),
            'predicted_value': predicted_value,
        }
    )


def _load_manifest(manifest_path: str) -> dict:
    return json.loads(Path(manifest_path).read_text(encoding='utf-8'))


def evaluate_folds(
    train_model: TrainModel,
    features_path: str,
    manifest_path: str,
    out_dir: str,
    folds_n: int = 10,
    seed: int = 42,
    tol: float = 0.05,
) -> dict:
    """Train + score ``train_model`` once per masked-holdout fold; return the aggregate metrics dict.

    The per-fold loop of ``model.xgboost.model.run_evaluate`` refactored to *return* rather than print, so
    :func:`run_evaluate` and :mod:`model.compare` share one code path. For each fold write
    ``train.csv``/``eval.csv``, fit on the train split, answer the eval predict cells, persist
    ``answer.csv``, and grade against the global truth. The returned dict holds ``eligible``/``folds_n``/
    ``seed``/``tol``, the per-fold lists under ``per_fold`` (each metric plus ``n``/``n_missing``), and an
    ``avg``/``min``/``max`` summary per metric.
    """
    df = folds.load_features(features_path)
    manifest = _load_manifest(manifest_path)
    features = manifest['predict_safe_features']

    eligible = folds.select_eligible(df)
    fold_rows = folds.assign_folds(eligible, folds_n, seed)
    truth = scoring.build_truth(df)

    agg: dict[str, list[float]] = {m: [] for m in _METRICS}
    n_rows: list[int] = []
    n_missing: list[int] = []
    for k, rows in enumerate(fold_rows, start=1):
        fold_dir = Path(out_dir) / str(k)
        folds.write_fold(df, manifest, rows, str(fold_dir))
        eval_df = folds.load_features(str(fold_dir / 'eval.csv'))
        model = train_model(folds.load_features(str(fold_dir / 'train.csv')), features, seed)
        predict_cells(model, eval_df, features).to_csv(fold_dir / 'answer.csv', index=False)

        m = scoring.fold_metrics(
            scoring.expected_cells(eval_df), truth, scoring.load_answers(str(fold_dir / 'answer.csv')), tol
        )
        for name in _METRICS:
            agg[name].append(m[name])
        n_rows.append(m['n'])
        n_missing.append(m['n_missing'])

    result: dict[str, Any] = {
        'eligible': len(eligible),
        'folds_n': folds_n,
        'seed': seed,
        'tol': tol,
        'per_fold': {**agg, 'n': n_rows, 'n_missing': n_missing},
    }
    for name in _METRICS:
        vals = agg[name]
        result[name] = {
            'avg': float(np.nanmean(vals)),
            'min': float(np.nanmin(vals)),
            'max': float(np.nanmax(vals)),
        }
    return result


def run_evaluate(
    train_model: TrainModel,
    features_path: str,
    manifest_path: str,
    out_dir: str,
    folds_n: int = 10,
    seed: int = 42,
    tol: float = 0.05,
) -> int:
    """Run :func:`evaluate_folds` and print the same per-fold + aggregate table as ``model.xgboost``."""
    result = evaluate_folds(train_model, features_path, manifest_path, out_dir, folds_n, seed, tol)
    pf = result['per_fold']
    print(
        f'eligible rows: {result["eligible"]}  ->  {folds_n} folds (seed {seed}); training on steady single-fuel rows'
    )

    header = f'{"fold":>4}  {"n":>5}  {"miss":>4}  ' + '  '.join(f'{m:>14}' for m in _METRICS)
    print(header)
    print('-' * len(header))
    for k in range(folds_n):
        row = '  '.join(f'{pf[m][k]:>14.6f}' for m in _METRICS)
        print(f'{k + 1:>4}  {pf["n"][k]:>5}  {pf["n_missing"][k]:>4}  ' + row)

    precisions = pf['precision']
    print('-' * len(header))
    print(
        f'precision  avg={np.mean(precisions):.6f}  min={min(precisions):.6f}  max={max(precisions):.6f}  (tol={tol})'
    )
    print(
        f'   mae avg={np.nanmean(pf["mae"]):.6f}   rmse avg={np.nanmean(pf["rmse"]):.6f}   '
        f'mape avg={np.nanmean(pf["mape"]):.6f}'
    )
    return 0


def run_predict(
    train_model: TrainModel, features_path: str, manifest_path: str, out_path: str = 'etl/submission.csv'
) -> int:
    """Train on every labelled steady single-fuel row, then write the 102-cell README submission CSV.

    Parameterized copy of ``model.xgboost.model.run_predict``; only ever used if a comparison model is
    promoted to the submission slot (xgboost owns it today).
    """
    df = folds.load_features(features_path)
    manifest = _load_manifest(manifest_path)
    features = manifest['predict_safe_features']

    model = train_model(df, features)
    answer = predict_cells(model, df, features)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    answer.to_csv(out, index=False)

    ships = sorted(answer['ship_id'].unique().tolist())
    print(
        f'wrote {len(answer)} predictions -> {out}  ships={ships}  '
        f'value range [{answer["predicted_value"].min():.3f}, {answer["predicted_value"].max():.3f}]'
    )
    return 0


def permutation_importance_shared(
    model: Any, x: pd.DataFrame, y: pd.Series, features: list[str], seed: int
) -> pd.Series:
    """Model-agnostic permutation importance (mean RMSE increase) on a held-out slice, sorted descending.

    Scored with ``neg_root_mean_squared_error`` so every family is ranked on the same yardstick — the only
    apples-to-apples cross-model importance. Works uniformly on an XGBRegressor, a sklearn Pipeline, or a
    HistGBR because each estimator handles its own NaN in ``x``.
    """
    r = permutation_importance(model, x, y, scoring='neg_root_mean_squared_error', n_repeats=10, random_state=seed)
    return pd.Series(r.importances_mean, index=features).sort_values(ascending=False)


def fit_holdout(
    train_model: TrainModel, df: pd.DataFrame, features: list[str], seed: int = 42, test_size: float = 0.2
) -> tuple[Any, pd.DataFrame, pd.Series]:
    """Fit ``train_model`` on a fixed-seed split of the steady single-fuel rows; return ``(model, X_ho, y_ho)``.

    The mask is model-independent, so a fixed ``seed`` yields the *identical* held-out 20% for every model —
    the shared holdout the permutation-importance pass and cross-model comparison require.
    """
    x, y, mask = build_xy(df, features)
    idx = df.index[mask]
    train_idx, ho_idx = train_test_split(idx, test_size=test_size, random_state=seed)
    model = train_model(df.loc[train_idx], features, seed)
    return model, x.loc[ho_idx], y.loc[ho_idx]


def run_importance(
    train_model: TrainModel,
    native_importance: NativeImportance,
    features_path: str,
    manifest_path: str,
    top: int = 20,
    out_path: str | None = None,
    seed: int = 42,
) -> pd.DataFrame:
    """Fit on 80% of the steady single-fuel rows, then report native + shared permutation importance.

    Both importances are measured on the same fixed-seed 20% holdout the model never trained on. Prints the
    top ``top`` features by permutation importance and, when ``out_path`` is given, writes the full table
    (``permutation`` always, ``native`` when the model exposes one) to CSV.
    """
    df = folds.load_features(features_path)
    manifest = _load_manifest(manifest_path)
    features = manifest['predict_safe_features']

    model, x_ho, y_ho = fit_holdout(train_model, df, features, seed)
    perm = permutation_importance_shared(model, x_ho, y_ho, features, seed)
    native = native_importance(model, features)

    table = pd.DataFrame({'permutation': perm})
    if native is not None:
        table['native'] = native  # aligns on the feature index
    table = table.sort_values('permutation', ascending=False)

    has_native = native is not None
    print(f'permutation importance on {len(x_ho)} holdout rows, {len(features)} predict-safe features')
    print(
        f'\ntop {top} features by permutation importance (native importance {"shown" if has_native else "not available"}):'
    )
    for rank, (name, row) in enumerate(table.head(top).iterrows(), 1):
        native_str = f'  native={row["native"]:.4f}' if has_native else ''
        print(f'  {rank:2d}. {name:34s} perm={row["permutation"]:.6f}{native_str}')

    if out_path:
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        table.to_csv(out)
        print(f'\nwrote importance table -> {out}')
    return table
