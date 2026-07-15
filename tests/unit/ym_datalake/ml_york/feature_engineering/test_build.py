"""Manifest contract + predict-safe feature completeness (the leakage firewall)."""

from __future__ import annotations

import json

from ym_datalake.ml_york.feature_engineering import build, io

# Features that depend only on 100%-filled nav + maintenance + a given fuel identity, so they must be
# present on every one of the 102 predict rows.
ALWAYS_ON_PREDICT = [
    'days_since_hull_clean',
    'days_since_prop_polish',
    'days_since_dry_dock',
    'days_since_hull_clean_log1p',
    'admiralty_fuel_proxy',
    'stw3',
    'rpm3',
    'mean_draft',
    'displacement_filled',
    'displacement_23',
    'thermal_fouling_index',
    'speed_per_rpm',
    'depth_draft_ratio',
    'fuel_lcv',
    'hours_full_speed',
    'wind_scale',
    # feature-engineering enhancements — all derived from 100%-filled nav/maintenance + fuel identity.
    'rpm_excess_type',
    'thermal_exposure_since_clean',
    'apparent_advance',
    'wetted_proxy',
    'reynolds_proxy',
    'hull_clock_sat',
    # physics interactions: admiralty power point × fouling-age clock / combined wave (all A/F-derived).
    'admiralty_x_hull_clock',
    'admiralty_x_wave',
]


def test_manifest_never_lists_an_h_or_t_column_as_predict_safe(manifest):
    safe = set(manifest['predict_safe_features'])
    for leaked in io.LEAKAGE_COLS:
        assert leaked not in safe, f'{leaked} (H/T leakage) must not be a model input'


def test_leakage_columns_are_exactly_h_plus_all_t(manifest):
    assert manifest['leakage_columns'] == io.H_COLS + io.T_COLS


def test_predict_safe_excludes_ids_flags_targets(manifest):
    safe = set(manifest['predict_safe_features'])
    for col in build.ID_COLUMNS + build.FLAG_COLUMNS + build.TARGET_COLUMNS:
        assert col not in safe


def test_every_predict_safe_feature_exists_in_frame(features, safe_features):
    assert set(safe_features) <= set(features.columns)


def test_always_on_features_populated_on_predict_rows(features):
    predict = features[features['is_predict']]
    assert len(predict) == 102
    missing = {c: int(predict[c].isna().sum()) for c in ALWAYS_ON_PREDICT if predict[c].isna().any()}
    assert not missing, f'predict-safe features unexpectedly null on predict rows: {missing}'


def test_fuel_features_predict_safe_and_known_on_predict_rows(features):
    predict = features[features['is_predict']]
    # the fuel identity IS given on a predict cell, so exactly one one-hot fires and LCV is known.
    onehot = [f'fuel_is_{k.lower()}' for k in io.LCV]
    assert (predict[onehot].sum(axis=1) == 1).all()
    assert predict['fuel_lcv'].notna().all()


def test_manifest_round_trips_as_json(manifest):
    assert json.loads(json.dumps(manifest))['n_predict_rows'] == 102


def test_manifest_counts_match_frame(features, manifest):
    assert manifest['n_rows'] == len(features)
    assert manifest['n_predict_rows'] == int(features['is_predict'].sum())
