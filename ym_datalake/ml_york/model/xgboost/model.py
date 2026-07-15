"""XGBoost regressor for ME full-speed fuel consumption, plus its evaluate/predict orchestration.

The model regresses ``log(target_energy_mj_per_hour)`` on ``predict_safe_features`` only. Energy (via
LCV) strips fuel identity so every fuel is one target; the per-hour form is the exact linear
``HOURS_FULL_SPEED`` correction the README mandates; ``log`` aligns squared loss with the relative-error
precision metric. The submission mass is reconstructed per row as::

    predicted_value = exp(pred) * hours_full_speed / fuel_lcv        # MT/day, single fuel

``hours_full_speed`` and ``fuel_lcv`` are predict-safe and populated on every eval row and all 102 real
cells; ``fuel_lcv == LCV[target_fuel_type]`` so the LCV baked into the training target cancels exactly.

Training is restricted to the README predict-day gate — steady-state (``is_steady_state``) single-fuel
rows with a finite positive target — matching the 102-cell distribution. Raw fuel columns are read only
to *count* fuels for that gate (as ``folds.select_eligible`` does), never as model inputs, so no leakage
reaches the predictions. XGBoost ingests NaN natively; no imputation is done.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from ym_datalake.ml_york.evaluation import folds, scoring

_FUEL_PREFIX = 'ME_FULLSPEED_CONSUMP_'
_METRICS = ['precision', 'one_minus_mape', 'mae', 'rmse', 'r2', 'mape']

# XGBoost 3.x: early_stopping_rounds / eval_metric are CONSTRUCTOR kwargs, not fit() args.
# The regularization-leaning variant (max_depth 5, min_child_weight 8, gamma/reg_alpha/colsample_bylevel)
# was ablated and reverted: it regressed precision by ~0.14 on random-fold and ~0.06 on LOSO.
_XGB_PARAMS = {
    'tree_method': 'hist',
    'n_estimators': 2000,
    'learning_rate': 0.03,
    'max_depth': 6,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 5,
    'reg_lambda': 1.0,
    'early_stopping_rounds': 50,
    'eval_metric': 'rmse',
}


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

    ``X`` is every ``features`` column coerced to float (NaN passed through for XGBoost to split on).
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


class _LogMeanEnsemble:
    """Seed-bagged XGB members averaged in log space; duck-types :meth:`XGBRegressor.predict`.

    ``predict`` returns the mean of the members' log-space outputs, so it drops straight into
    ``predict_cells`` (``exp(pred) * hours / lcv``) with no change: the mean is upstream of the
    ``exp``/``/fuel_lcv`` step, so the exact LCV-cancellation invariant is preserved. Each member
    already applies its own ``best_iteration`` inside ``m.predict``.
    """

    def __init__(self, members: list[XGBRegressor]):
        self.members = members

    def predict(self, x) -> np.ndarray:
        return np.mean([m.predict(x) for m in self.members], axis=0)


def train_model(
    train_df: pd.DataFrame, features: list[str], seed: int = 42, n_models: int = 5
) -> XGBRegressor | _LogMeanEnsemble:
    """Fit the steady single-fuel labelled rows, early-stopping on a random 10% holdout.

    ``n_models > 1`` fits a log-space seed-bagging ensemble: member ``i`` uses ``random_state=seed+i``,
    so it re-draws its subsample/colsample AND its early-stopping split (free decorrelation, stabilised
    ``best_iteration``). Returns a bare :class:`XGBRegressor` when ``n_models == 1``, else a
    :class:`_LogMeanEnsemble`; both expose the same ``predict`` so callers stay unchanged. A ship-grouped
    early-stopping split was ablated and reverted (it regressed precision on both harnesses).
    """
    x, y, mask = build_xy(train_df, features)
    x_fit, y_fit = x.loc[mask], y.loc[mask]

    members: list[XGBRegressor] = []
    for i in range(n_models):
        member_seed = seed + i
        x_tr, x_val, y_tr, y_val = train_test_split(x_fit, y_fit, test_size=0.1, random_state=member_seed)
        member = XGBRegressor(random_state=member_seed, **_XGB_PARAMS)
        member.fit(x_tr, y_tr, eval_set=[(x_val, y_val)], verbose=False)
        members.append(member)
    return members[0] if n_models == 1 else _LogMeanEnsemble(members)


def predict_cells(model: XGBRegressor, eval_df: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    """Answer every ``is_predict`` row: reconstruct MT/day and emit README submission columns.

    Returns ``ship_id, day (=noon_utc verbatim), fuel_type (=ME_FULLSPEED_CONSUMP_<target_fuel_type>),
    predicted_value``. ``predict()`` uses the model's ``best_iteration`` automatically.
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


def run_evaluate(
    features_path: str,
    manifest_path: str,
    out_dir: str,
    folds_n: int = 10,
    seed: int = 42,
    tol: float = 0.05,
    n_models: int = 5,
    group_by_ship: bool = False,
) -> int:
    """Train + score one model per holdout fold; print per-fold and aggregate metrics.

    Mirrors ``evaluation._cmd_generate``: build eligible rows, split them, and for each fold write
    ``train.csv``/``eval.csv``, fit on the train split, answer the eval predict cells, persist
    ``answer.csv`` (so ``evaluation evaluate`` can cross-check), and grade against the global truth.
    ``group_by_ship`` swaps the random split for honest leave-one-ship-out folds (one whole unseen ship
    per fold); ``n_models`` sets the log-space seed-bagging ensemble size passed to ``train_model``.
    """
    df = folds.load_features(features_path)
    manifest = _load_manifest(manifest_path)
    features = manifest['predict_safe_features']

    eligible = folds.select_eligible(df)
    if group_by_ship:
        fold_rows = folds.assign_folds_by_ship(eligible, seed)
        split_desc = f'{len(fold_rows)} leave-one-ship-out folds (seed {seed})'
    else:
        fold_rows = folds.assign_folds(eligible, folds_n, seed)
        split_desc = f'{folds_n} random folds (seed {seed})'
    truth = scoring.build_truth(df)
    print(f'eligible rows: {len(eligible)}  ->  {split_desc}; ensemble n_models={n_models}')

    header = f'{"fold":>4}  {"n":>5}  {"miss":>4}  ' + '  '.join(f'{m:>14}' for m in _METRICS)
    print(header)
    print('-' * len(header))

    agg: dict[str, list[float]] = {m: [] for m in _METRICS}
    for k, rows in enumerate(fold_rows, start=1):
        label = str(rows[0]['ship']) if group_by_ship else str(k)
        fold_dir = Path(out_dir) / str(k)
        folds.write_fold(df, manifest, rows, str(fold_dir))
        eval_df = folds.load_features(str(fold_dir / 'eval.csv'))
        model = train_model(folds.load_features(str(fold_dir / 'train.csv')), features, seed, n_models)
        predict_cells(model, eval_df, features).to_csv(fold_dir / 'answer.csv', index=False)

        m = scoring.fold_metrics(
            scoring.expected_cells(eval_df), truth, scoring.load_answers(str(fold_dir / 'answer.csv')), tol
        )
        for name in _METRICS:
            agg[name].append(m[name])
        print(f'{label:>4}  {m["n"]:>5}  {m["n_missing"]:>4}  ' + '  '.join(f'{m[x]:>14.6f}' for x in _METRICS))

    precisions = agg['precision']
    print('-' * len(header))
    print(
        f'precision  avg={np.mean(precisions):.6f}  min={min(precisions):.6f}  max={max(precisions):.6f}  (tol={tol})'
    )
    print(
        f'   mae avg={np.nanmean(agg["mae"]):.6f}   rmse avg={np.nanmean(agg["rmse"]):.6f}   '
        f'r2 avg={np.nanmean(agg["r2"]):.6f}   mape avg={np.nanmean(agg["mape"]):.6f}'
    )
    return 0


def run_predict(features_path: str, manifest_path: str, out_path: str = 'etl/submission.csv', n_models: int = 5) -> int:
    """Train on every labelled steady single-fuel row, then write the 102-cell README submission CSV."""
    df = folds.load_features(features_path)
    manifest = _load_manifest(manifest_path)
    features = manifest['predict_safe_features']

    model = train_model(df, features, n_models=n_models)
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
