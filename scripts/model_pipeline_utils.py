#!/usr/bin/env python3
"""Shared feature preparation utilities for model training and submission generation."""

from __future__ import annotations

import pandas as pd
from feature_engineering import ENGINEERED_COLUMNS

# The authoritative allowlist of features the model may use, in order. This is an
# include-list: only columns named here become features. Everything else in the CSV is
# ignored by construction -- id columns (De-identification Name, VOYAGE), the target
# columns, the raw ME_FULLSPEED_CONSUMP_* fuels, the H/T columns masked at predict time
# (HORSE_POWER, LOAD_PCT, SFOC, ME_SLIP, THRUST, THRUST_QUOTIENT, TOTAL_CONSUMP,
# ME_CONSUMPTION), the raw 0-15 compass indices (replaced by *_SIN/_COS), and the raw
# hull_fouling_type string (replaced by the fouling_* multi-hot).
#
# To add or drop a feature, edit this list. Engineered features are defined (and named)
# in feature_engineering.ENGINEERED_COLUMNS and spliced in below.
BASE_FEATURE_COLUMNS: list[str] = [
    # environment / navigation (category A, visible at predict time)
    'NOON_UTC',
    'AVG_SPEED',
    'SPEED_THROUGH_WATER',
    'ME_AVG_RPM',
    'PROPELLER_SPEED',
    'FORE_DRAFT',
    'AFTER_DRAFT',
    'MID_DRAFT',
    'DISPLACEMENT',
    'CARGO_ON_BOARD',
    'WIND_SCALE',
    'SEA_HEIGHT',
    'SEA_WATER_TEMP',
    'WIND_SPEED',
    'SWELL_HEIGHT',
    'WATER_DEPTH',
    'TOTAL_DISTANCE',
    'SEA_SPEED_DISTANCE',
    'DIFF_STW_SOG_SLIP',
    'FULL_SPD_STW_SLIP',
    'HOURS_FULL_SPEED',
    'HOURS_TOTAL',
    # maintenance-event features
    'days_since_last_maintenance',
    'has_ever_had_maintenance',
    'maintenance_event_count_all',
    'maintenance_event_count_30d',
    'maintenance_event_count_90d',
    'maintenance_event_count_180d',
    'has_maintenance_today',
    'days_since_last_polishing',
    'has_ever_had_polishing',
    'days_since_last_cleaning',
    'has_ever_had_cleaning',
    'days_since_last_inspection',
    'has_ever_had_inspection',
    'days_since_last_dock',
    'has_ever_had_dock',
    'last_maintenance_draft_fwd_m',
    'last_maintenance_draft_aft_m',
    'last_maintenance_event_type_normalized',
    'last_maintenance_propeller_condition',
    'last_maintenance_hull_coating_condition',
    'last_maintenance_cavitation_found',
]

FEATURE_COLUMNS: list[str] = BASE_FEATURE_COLUMNS + ENGINEERED_COLUMNS


def build_feature_columns(df: pd.DataFrame) -> list[str]:
    """Return the allowlisted feature columns that are present in ``df``, in order."""

    return [col for col in FEATURE_COLUMNS if col in df.columns]


def split_feature_types(*dfs: pd.DataFrame, feature_cols: list[str]) -> tuple[list[str], list[str]]:
    numeric_features: list[str] = []
    categorical_features: list[str] = []

    combined = pd.concat([df[feature_cols].copy() for df in dfs], ignore_index=True)

    for col in feature_cols:
        series = combined[col]
        non_empty_original = series.dropna().astype(str).str.strip().ne('')
        if len(non_empty_original) == 0:
            categorical_features.append(col)
            continue

        sampled = series.dropna().astype(str).str.strip()
        numeric_like_count = 0
        for value in sampled:
            if value in {'', 'nan', 'None', 'NULL'}:
                continue
            try:
                float(value)
                numeric_like_count += 1
            except ValueError:
                pass

        if col in {'HOURS_FULL_SPEED', 'HOURS_TOTAL'}:
            numeric_features.append(col)
        elif numeric_like_count / max(1, len(sampled)) >= 0.95:
            numeric_features.append(col)
        else:
            categorical_features.append(col)

    return numeric_features, categorical_features


def prepare_feature_frame(
    df: pd.DataFrame,
    feature_cols: list[str],
    numeric_features: list[str] | None = None,
    categorical_features: list[str] | None = None,
) -> pd.DataFrame:
    prepared = df[feature_cols].copy()
    if numeric_features is None or categorical_features is None:
        numeric_features, categorical_features = split_feature_types(df, feature_cols=feature_cols)

    for col in numeric_features:
        prepared[col] = pd.to_numeric(prepared[col], errors='coerce')

    for col in categorical_features:
        prepared[col] = prepared[col].astype(str).replace({'nan': '', 'None': ''})

    return prepared
