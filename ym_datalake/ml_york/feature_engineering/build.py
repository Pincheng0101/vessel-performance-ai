"""Orchestrate the feature pipeline and write ``etl/vt_fd_features.csv`` + ``etl/feature_manifest.json``.

Order matters: statistics need the group-C/D speed/draft columns, and the thermal fouling index needs
both the maintenance clock and the trailing temp mean. The manifest is the contract a trainer reads —
it selects ``predict_safe_features`` and nothing else, and ``leakage_columns`` names every H/T raw
column that must stay out of the model.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ym_datalake.ml_york.feature_engineering import io, maintenance, physics_features, statistics

# Keys/flags/targets are not model inputs; everything engineered on top of A/F + maintenance + time is.
ID_COLUMNS = ['ship_id', 'noon_utc', 'ship_type', 'VOYAGE']
FLAG_COLUMNS = ['is_masked', 'is_predict', 'is_steady_state']
TARGET_COLUMNS = [
    'target_fuel_type',
    'target_me_fs_consump',
    'target_me_fs_consump_per_hour',
    'target_energy_mj',
    'target_energy_mj_per_hour',
]


def build_features(data_dir: str = 'dataset', out_dir: str = 'etl') -> pd.DataFrame:
    """Run the full pipeline and persist the two ``etl/`` artefacts. Returns the feature frame."""
    df = assemble_features(data_dir)
    manifest = build_manifest(df)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    df.to_csv(out / 'vt_fd_features.csv', index=False)
    (out / 'feature_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return df


def assemble_features(data_dir: str = 'dataset') -> pd.DataFrame:
    """Load -> maintenance -> physics -> statistics -> thermal index, with no writes (used by tests)."""
    df = io.load_vt_fd(data_dir)
    events = maintenance.load_events(data_dir)
    df = maintenance.add_maintenance_features(df, events)
    df = physics_features.add_physics_features(df)
    df = statistics.add_statistics_features(df)
    df = statistics.add_speed_loss_features(df)
    df = statistics.add_thermal_fouling_index(df)
    return df


def predict_safe_features(df: pd.DataFrame) -> list[str]:
    """Every engineered column: the frame minus original vt_fd columns, keys, flags and targets.

    Because every engineered column is derived only from A/F columns + maintenance.csv + time, the
    complement of the (original + meta) set is exactly the predict-safe, leakage-free feature list.
    """
    reserved = set(io.ORIGINAL_COLUMNS) | set(ID_COLUMNS) | set(FLAG_COLUMNS) | set(TARGET_COLUMNS)
    return [c for c in df.columns if c not in reserved]


def build_manifest(df: pd.DataFrame) -> dict:
    safe = predict_safe_features(df)
    leaked = set(io.LEAKAGE_COLS)
    assert not (leaked & set(safe)), f'leakage columns leaked into predict-safe set: {leaked & set(safe)}'
    return {
        'id_columns': ID_COLUMNS,
        'flag_columns': FLAG_COLUMNS,
        'target_columns': TARGET_COLUMNS,
        'leakage_columns': io.LEAKAGE_COLS,
        'predict_safe_features': safe,
        'n_rows': int(len(df)),
        'n_predict_rows': int(df['is_predict'].sum()),
        'target_for_training': 'target_energy_mj',
        'notes': (
            'Model inputs = predict_safe_features only. In a PREDICT window only A (env/nav) + F '
            '(WIND_SCALE, HOURS_FULL_SPEED) columns are visible; H (engine) and T (all fuel / '
            'TOTAL_CONSUMP / ME_CONSUMPTION) are HIDDEN and listed under leakage_columns. Data sources '
            'are dataset/vt_fd.csv and dataset/maintenance.csv only.'
        ),
    }
