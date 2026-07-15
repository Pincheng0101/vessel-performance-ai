"""Standalone driver: predict ME full-speed HSHFO consumption for the dataset-submission holdout.

Reuses the ml_york pipeline unchanged (no package edits). Assembles a combined raw ``vt_fd.csv`` whose
train rows are labelled and whose test rows carry the ``PREDICT``/``HIDDEN`` masks, builds features,
trains XGBoost on the labelled steady single-fuel rows, answers every ``PREDICT`` row, then maps the
predictions 1:1 back onto ``test_submission.csv``'s 5,571-row order via an exact-string merge on the 40
raw columns. Run from the repo root: ``uv run python dataset-submission/generate_submission.py``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

from ym_datalake.ml_york.feature_engineering.build import build_features
from ym_datalake.ml_york.feature_engineering.io import FUEL_COLS, ORIGINAL_COLUMNS
from ym_datalake.ml_york.model.xgboost import predict_cells, train_model
from ym_datalake.ml_york.model.xgboost.model import _is_true

HERE = Path(__file__).resolve().parent
DATASET = HERE.parent / 'dataset'
FUEL_TYPE = 'ME_FULLSPEED_CONSUMP_HSHFO'


def evaluate_against_truth(out: pd.DataFrame, truth_csv: Path, label: str) -> None:
    """Post-hoc MAE/RMSE of ``predicted_value`` vs the real per-day ME full-speed fuel mass in ``truth_csv``.

    ``truth_csv`` is a raw 40-column file (``dataset/vt_fd.csv`` or the held-out ``test.csv``); it is
    filtered to the submission's ships and never used to predict. ``(ship, day)`` is not unique, so
    near-dup days are averaged before the join. Reported both over the README steady-state single-fuel
    predict-cell population (the fair read) and over all matched rows.
    """
    vt = pd.read_csv(truth_csv, dtype=str, encoding='utf-8-sig')
    vt = vt[vt['De-identification Name'].isin(out['ship_id'].unique())]
    fuel_num = vt[FUEL_COLS].apply(pd.to_numeric, errors='coerce')
    truth = pd.DataFrame(
        {
            'ship_id': vt['De-identification Name'].astype(str),
            'day': pd.to_numeric(vt['NOON_UTC']).astype(int),
            'truth_mass': fuel_num.sum(axis=1, min_count=1),
            'hours': pd.to_numeric(vt['HOURS_FULL_SPEED'], errors='coerce'),
            'wind': pd.to_numeric(vt['WIND_SCALE'], errors='coerce'),
            'n_fuel': (fuel_num > 0).sum(axis=1),
        }
    )
    per_day = truth.groupby(['ship_id', 'day'], as_index=False).agg(
        truth_mass=('truth_mass', 'mean'),
        hours=('hours', 'mean'),
        wind=('wind', 'mean'),
        n_fuel=('n_fuel', 'max'),
    )

    m = out.assign(day=out['day'].astype(int)).merge(per_day, on=['ship_id', 'day'], how='left')
    pred, t = m['predicted_value'].to_numpy(), m['truth_mass'].to_numpy()
    valid = np.isfinite(t) & (t > 0)
    steady = valid & (m['hours'] >= 22.0).to_numpy() & (m['wind'] <= 4.0).to_numpy() & (m['n_fuel'] == 1).to_numpy()

    print(f'submission vs {label} (MT/day):')
    for name, mask in [('steady single-fuel predict cells', steady), ('all matched rows (truth>0)', valid)]:
        err = pred[mask] - t[mask]
        print(
            f'  {name:>32}: n={int(mask.sum()):>4}  MAE={np.mean(np.abs(err)):.4f}  RMSE={np.sqrt(np.mean(err**2)):.4f}'
        )


def main(data_dir: Path) -> int:
    train = pd.read_csv(data_dir / 'train.csv', dtype=str, encoding='utf-8-sig')
    test_submission = pd.read_csv(data_dir / 'test_submission.csv', dtype=str, encoding='utf-8-sig')

    with tempfile.TemporaryDirectory() as tmp:
        tmp_data = Path(tmp) / 'data'
        tmp_etl = Path(tmp) / 'etl'
        tmp_data.mkdir(parents=True)

        # 1. Combined raw frame: labelled train rows then masked (PREDICT/HIDDEN) test rows, order kept.
        combined = pd.concat([train, test_submission], ignore_index=True)
        combined.to_csv(tmp_data / 'vt_fd.csv', index=False)
        shutil.copy(DATASET / 'maintenance.csv', tmp_data / 'maintenance.csv')

        # 2. Build features + manifest (io drops the exact-duplicate rows internally).
        df = build_features(str(tmp_data), str(tmp_etl))
        manifest = json.loads((tmp_etl / 'feature_manifest.json').read_text(encoding='utf-8'))
        features = manifest['predict_safe_features']

        # Row-aligned string frame == io's raw after the same drop_duplicates (for mapping back).
        raw = pd.read_csv(tmp_data / 'vt_fd.csv', dtype=str, encoding='utf-8-sig')
        combined_dedup = raw.drop_duplicates().reset_index(drop=True)

    n_predict = int(_is_true(df['is_predict']).sum())
    print(f'is_predict rows: {n_predict}  (features: {len(features)})')

    # 3. Train on labelled steady single-fuel rows (test rows have NaN target -> auto-excluded).
    model = train_model(df, features)
    answer = predict_cells(model, df, features)  # one row per is_predict row, in df order

    # 4. Attach predictions to the row-aligned frame, then LEFT-merge onto the full 5,571 rows.
    assert (combined_dedup['De-identification Name'].to_numpy() == df['ship_id'].to_numpy()).all()
    assert (combined_dedup['NOON_UTC'].astype(int).to_numpy() == df['noon_utc'].astype(int).to_numpy()).all()

    pred_idx = df.index[_is_true(df['is_predict'])]
    combined_dedup['predicted_value'] = np.nan
    combined_dedup.loc[pred_idx, 'predicted_value'] = answer['predicted_value'].to_numpy()

    right = combined_dedup.loc[pred_idx, ORIGINAL_COLUMNS + ['predicted_value']]
    merged = test_submission.merge(right, on=ORIGINAL_COLUMNS, how='left')
    assert len(merged) == len(test_submission), f'merge changed row count: {len(merged)} != {len(test_submission)}'
    assert merged['predicted_value'].notna().all(), 'unmatched test_submission rows -> NaN prediction'

    # 5. Write the README 4-column submission, 1:1 with test_submission.csv order.
    out = pd.DataFrame(
        {
            'ship_id': merged['De-identification Name'],
            'day': merged['NOON_UTC'],
            'fuel_type': FUEL_TYPE,
            'predicted_value': merged['predicted_value'],
        }
    )
    out_path = data_dir / 'submission.csv'
    out.to_csv(out_path, index=False)
    print(
        f'wrote {len(out)} rows -> {out_path}  ships={sorted(out["ship_id"].unique())}  '
        f'value range [{out["predicted_value"].min():.3f}, {out["predicted_value"].max():.3f}]'
    )

    evaluate_against_truth(out, DATASET / 'vt_fd.csv', 'real dataset/vt_fd.csv')
    evaluate_against_truth(out, data_dir / 'test.csv', f'test set ({data_dir}/test.csv)')
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        'data_dir',
        nargs='?',
        type=Path,
        default=HERE,
        help='folder holding train.csv / test.csv / test_submission.csv; submission.csv is written here',
    )
    args = parser.parse_args()
    raise SystemExit(main(args.data_dir))
