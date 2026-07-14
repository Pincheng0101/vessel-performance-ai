#!/usr/bin/env python3
"""Shared feature preparation utilities for model training and submission generation."""

from __future__ import annotations

from typing import Any

import pandas as pd


def build_feature_columns(df: pd.DataFrame) -> list[str]:
    exclude = {
        'target_value',
        'target_fuel_column',
        'is_prediction_row',
        'De-identification Name',
        'VOYAGE',
    }

    feature_cols = []
    for col in df.columns:
        if col in exclude:
            continue
        if col.startswith('ME_FULLSPEED_CONSUMP_'):
            continue
        feature_cols.append(col)

    for required_col in ['HOURS_FULL_SPEED', 'HOURS_TOTAL']:
        if required_col in df.columns and required_col not in feature_cols:
            feature_cols.append(required_col)

    return feature_cols


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
