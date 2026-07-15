"""Build the 10-fold masked holdout: pick eligible rows, split them, write ``train.csv``/``eval.csv``.

Eligible rows are labelled steady-state single-fuel days with a unique ``(ship, day, fuel)`` key — the only rows
whose per-fuel MT truth is unambiguous. Each fold's ``eval.csv`` mirrors a real ``PREDICT`` row: the
target + leakage columns are blanked and the masked flags set, while ``target_fuel_type`` (the fuel
identity is *given* on predict rows) and every ``predict_safe`` feature survive. ``train.csv`` is the
rest of the frame, unchanged, so its labels stay intact for the predictor to learn from.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

# The 5 raw per-fuel ME full-speed consumption columns (hardcoded; every other group is read from the
# manifest). Short fuel key = the column name with this prefix stripped, e.g. HSHFO, VLSFO, LSMGO.
FUEL_COLS = [
    'ME_FULLSPEED_CONSUMP_HSHFO',
    'ME_FULLSPEED_CONSUMP_ULSFO',
    'ME_FULLSPEED_CONSUMP_VLSFO',
    'ME_FULLSPEED_CONSUMP_LSMGO',
    'ME_FULLSPEED_CONSUMP_BIO_HSFO',
]
_FUEL_PREFIX = 'ME_FULLSPEED_CONSUMP_'

SHIP_COL = 'ship_id'
DAY_COL = 'noon_utc'
# In manifest ``target_columns`` but the fuel identity is given on a PREDICT row, so it is never blanked.
_KEEP_ON_EVAL = frozenset({'target_fuel_type'})


def load_features(path: str) -> pd.DataFrame:
    """Read the feature-engineered CSV as all-strings, so masked/blanked cells round-trip verbatim."""
    return pd.read_csv(path, dtype=str, encoding='utf-8-sig')


def select_eligible(df: pd.DataFrame) -> list[dict]:
    """Labelled steady-state single-``>0``-fuel rows with a unique ``(ship, day, fuel)`` key.

    Returns one ``{'row_idx', 'ship', 'day', 'fuel'}`` dict per eligible row (``fuel`` = short key).
    Steady-state rows are those flagged by the upstream ``is_steady_state`` gate (io.py) — the README
    ``PREDICT``-cell population the eval folds must imitate. Rows whose ``(ship, day, fuel)`` key is not
    unique are dropped entirely — their truth cannot be attributed to a single day/fuel, so they are
    unsafe to hide and score.
    """
    fuel_num = df[FUEL_COLS].apply(pd.to_numeric, errors='coerce')
    labelled = df['is_masked'].str.lower() != 'true'
    single_fuel = (fuel_num > 0).sum(axis=1) == 1
    steady = df['is_steady_state'].str.lower() == 'true'  # CSV read as str; matches io.py gate
    idx = df.index[labelled & single_fuel & steady]

    fuel_short = fuel_num.loc[idx].idxmax(axis=1).str.removeprefix(_FUEL_PREFIX)
    rows = pd.DataFrame(
        {
            'row_idx': idx.to_numpy(),
            'ship': df.loc[idx, SHIP_COL].to_numpy(),
            'day': df.loc[idx, DAY_COL].to_numpy(),
            'fuel': fuel_short.to_numpy(),
        }
    )
    unique = ~rows.duplicated(subset=['ship', 'day', 'fuel'], keep=False)
    return rows[unique].to_dict(orient='records')


def assign_folds(eligible: list[dict], n: int, seed: int) -> list[list[dict]]:
    """Shuffle the eligible rows with ``default_rng(seed)`` and split into ``n`` disjoint folds."""
    order = np.random.default_rng(seed).permutation(len(eligible))
    return [[eligible[i] for i in chunk] for chunk in np.array_split(order, n)]


def assign_folds_by_ship(eligible: list[dict], seed: int) -> list[list[dict]]:
    """Leave-one-ship-out: one fold per distinct ``ship``, ships shuffled by ``seed``.

    The honest cross-ship harness — every eval fold is a whole unseen ship, so no same-ship
    near-duplicate row can leak across the train/eval split. Returns the same ``list[list[dict]]``
    shape as :func:`assign_folds`, so ``write_fold``/scoring consume it verbatim.
    """
    by_ship: dict[str, list[dict]] = {}
    for r in eligible:
        by_ship.setdefault(r['ship'], []).append(r)
    ships = list(by_ship)
    order = np.random.default_rng(seed).permutation(len(ships))
    return [by_ship[ships[i]] for i in order]


def write_fold(df: pd.DataFrame, manifest: dict, fold_rows: list[dict], out_dir: str) -> None:
    """Write ``{out_dir}/eval.csv`` (the fold, masked) and ``{out_dir}/train.csv`` (everything else).

    ``eval.csv`` blanks ``target_columns ∪ leakage_columns`` (minus ``target_fuel_type``) and sets
    ``is_masked``/``is_predict`` to ``'True'``; ``train.csv`` is ``df`` with the fold rows dropped and
    otherwise untouched. Both keep all columns in their original order.
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    fold_idx = [r['row_idx'] for r in fold_rows]
    blank_cols = [c for c in manifest['target_columns'] + manifest['leakage_columns'] if c not in _KEEP_ON_EVAL]

    eval_df = df.loc[fold_idx].copy()
    eval_df.loc[:, blank_cols] = ''
    eval_df.loc[:, 'is_masked'] = 'True'
    eval_df.loc[:, 'is_predict'] = 'True'
    eval_df.to_csv(out / 'eval.csv', index=False)

    df.drop(index=fold_idx).to_csv(out / 'train.csv', index=False)
