"""Grade a fold's ``answer.csv`` against the per-fuel MT truth held in the global feature frame.

Everything is keyed on ``(ship, day, fuel_short)``. Truth comes from ``target_me_fs_consump`` on the
labelled rows of the *global* ``etl/vt_fd_features.csv`` (never from the masked ``eval.csv``); the
answer file is matched to it cell-by-cell. A predict cell with no answer is counted as a miss (wrong
for precision) and warned about. The headline metric is within-tolerance accuracy; MAE/RMSE/MAPE are
reported alongside over the answered cells.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

_FUEL_PREFIX = 'ME_FULLSPEED_CONSUMP_'
SHIP_COL = 'ship_id'
DAY_COL = 'noon_utc'


def _short_fuel(name: object) -> str:
    """Normalize a fuel label to its short key, accepting either full column name or short form."""
    return str(name).removeprefix(_FUEL_PREFIX)


def build_truth(df: pd.DataFrame) -> dict[tuple[str, str, str], float]:
    """``{(ship, day, fuel_short): target_me_fs_consump}`` for every labelled row carrying a truth."""
    labelled = df[df['is_masked'].str.lower() != 'true']
    truth: dict[tuple[str, str, str], float] = {}
    for ship, day, fuel, val in zip(
        labelled[SHIP_COL], labelled[DAY_COL], labelled['target_fuel_type'], labelled['target_me_fs_consump']
    ):
        if pd.isna(val) or pd.isna(fuel):
            continue
        truth[(str(ship), str(day), _short_fuel(fuel))] = float(val)
    return truth


def expected_cells(eval_df: pd.DataFrame) -> list[tuple[str, str, str]]:
    """The ``(ship, day, fuel_short)`` key of every ``is_predict`` row in a fold's ``eval.csv``."""
    predict = eval_df[eval_df['is_predict'].str.lower() == 'true']
    return [
        (str(ship), str(day), _short_fuel(fuel))
        for ship, day, fuel in zip(predict[SHIP_COL], predict[DAY_COL], predict['target_fuel_type'])
    ]


def load_answers(path: str) -> dict[tuple[str, str, str], float]:
    """Read a README-format ``ship_id,day,fuel_type,predicted_value`` answer file into a keyed dict.

    ``fuel_type`` is normalized to the short key, so a predictor may emit either the full
    ``ME_FULLSPEED_CONSUMP_HSHFO`` or the short ``HSHFO`` and still match. Rows with a blank
    ``predicted_value`` are skipped (treated as no answer for that cell).
    """
    df = pd.read_csv(path, dtype=str, encoding='utf-8-sig')
    answers: dict[tuple[str, str, str], float] = {}
    for ship, day, fuel, pred in zip(df['ship_id'], df['day'], df['fuel_type'], df['predicted_value']):
        if pd.isna(pred):
            continue
        answers[(str(ship), str(day), _short_fuel(fuel))] = float(pred)
    return answers


def fold_metrics(
    expected: list[tuple[str, str, str]],
    truth: dict[tuple[str, str, str], float],
    answers: dict[tuple[str, str, str], float],
    tol: float,
) -> dict:
    """Score one fold. ``precision`` = share of predict cells within ``tol`` relative error.

    A predict cell with no matching answer is a miss: it counts against precision and is warned about,
    but contributes no term to MAE/RMSE/MAPE (those are means over answered cells). Cells whose truth
    is absent from ``truth`` are skipped with a warning (should not occur for a well-formed fold).
    """
    y_true: list[float] = []
    y_pred: list[float] = []
    correct = 0
    scored = 0
    n_missing = 0
    for key in expected:
        true = truth.get(key)
        if true is None:
            warnings.warn(f'no truth for predict cell {key}; skipping')
            continue
        scored += 1
        pred = answers.get(key)
        if pred is None:
            n_missing += 1
            warnings.warn(f'missing answer for predict cell {key}; counted as incorrect')
            continue
        y_true.append(true)
        y_pred.append(pred)
        if abs(pred - true) / true <= tol:
            correct += 1

    yt = np.array(y_true, dtype=float)
    yp = np.array(y_pred, dtype=float)
    ape = np.abs(yp - yt) / yt if len(yt) else np.array([])
    mape = float(ape.mean()) if len(ape) else float('nan')
    return {
        'precision': correct / scored if scored else float('nan'),
        'one_minus_mape': 1.0 - mape,
        'mae': float(np.abs(yp - yt).mean()) if len(yt) else float('nan'),
        'rmse': float(np.sqrt(((yp - yt) ** 2).mean())) if len(yt) else float('nan'),
        'mape': mape,
        'n': scored,
        'n_missing': n_missing,
    }
