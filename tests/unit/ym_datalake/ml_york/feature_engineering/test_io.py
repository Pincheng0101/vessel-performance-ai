"""Load/clean/target behaviour against the real dataset (governing-constraint invariants)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ym_datalake.ml_york.feature_engineering import io

TARGET_COLS = [
    'target_me_fs_consump',
    'target_me_fs_consump_per_hour',
    'target_energy_mj',
    'target_energy_mj_per_hour',
]


def test_exact_duplicates_dropped(features):
    assert len(features) == 21219  # 21,282 raw - 63 exact dups


def test_predict_cell_count_and_ships(features):
    predict = features[features['is_predict']]
    assert len(predict) == 102
    assert set(predict['ship_id']) == {'S21', 'S22', 'S23'}


def test_predict_rows_have_null_targets(features):
    predict = features[features['is_predict']]
    assert predict[TARGET_COLS].isna().all().all()  # the label is exactly what must be predicted
    assert predict['is_predict'].all()


def test_predict_fuel_types_are_the_two_masked_fuels(features):
    predict = features[features['is_predict']]
    assert set(predict['target_fuel_type']) == {'HSHFO', 'VLSFO'}
    assert (predict['target_fuel_type'] == 'HSHFO').sum() == 91
    assert (predict['target_fuel_type'] == 'VLSFO').sum() == 11


def test_masked_rows_never_carry_a_target(features):
    assert features.loc[features['is_masked'], TARGET_COLS].isna().all().all()


def test_energy_equals_mass_times_lcv_on_single_fuel_rows(features):
    hshfo = 'ME_FULLSPEED_CONSUMP_HSHFO'
    others = [c for c in io.FUEL_COLS if c != hshfo]
    single = features[(~features['is_masked']) & (features[hshfo] > 0)]
    single = single[single[others].fillna(0).sum(axis=1) == 0].head(50)  # HSHFO the only fuel burned
    assert len(single) > 0
    ratio = single['target_energy_mj'] / single['target_me_fs_consump']
    assert (ratio.round(3) == io.LCV['HSHFO']).all()


def test_ship_type_grouping_matches_readme(features):
    by_ship = features.drop_duplicates('ship_id').set_index('ship_id')['ship_type']
    assert by_ship['S21'] == 'W1'  # W1 = S1..S8, S21
    assert by_ship['S22'] == 'W2' and by_ship['S23'] == 'W2'  # W2 = S9..S12, S22, S23


def test_steady_state_gate(features):
    ss = features[features['is_steady_state']]
    assert (ss['HOURS_FULL_SPEED'] >= 22).all()
    assert (ss['WIND_SCALE'] <= 4).all()
    # every PREDICT cell was pre-filtered to a steady-state point (README).
    assert features.loc[features['is_predict'], 'is_steady_state'].all()


# --- physical clipping (Phase 1 data quality) ---------------------------------------------------
def test_clip_physical_maps_out_of_range_to_nan():
    df = pd.DataFrame(
        {
            'SPEED_THROUGH_WATER': [12.0, 98.0, -1.0],  # in / above / below range
            'ME_AVG_RPM': [60.0, 113.0, 45.0],  # 113 > 90 upper bound
            'DISPLACEMENT': [100_000.0, 1_600_000.0, 20_000.0],  # both extremes implausible
            'FULL_SPD_STW_SLIP': [5.0, -887_400.0, 50.0],  # the poisoning outlier
            'ME_FULLSPEED_CONSUMP_HSHFO': [30.0, -5.0, 0.0],  # negative mass is impossible
        }
    )
    io._clip_physical(df)
    assert df['SPEED_THROUGH_WATER'][0] == 12.0
    assert np.isnan(df['SPEED_THROUGH_WATER'][1]) and np.isnan(df['SPEED_THROUGH_WATER'][2])
    assert df['ME_AVG_RPM'][0] == 60.0 and np.isnan(df['ME_AVG_RPM'][1]) and df['ME_AVG_RPM'][2] == 45.0
    assert np.isnan(df['DISPLACEMENT'][1]) and np.isnan(df['DISPLACEMENT'][2])
    assert np.isnan(df['FULL_SPD_STW_SLIP'][1]) and df['FULL_SPD_STW_SLIP'][0] == 5.0
    assert np.isnan(df['ME_FULLSPEED_CONSUMP_HSHFO'][1]) and df['ME_FULLSPEED_CONSUMP_HSHFO'][2] == 0.0


def test_clipping_leaves_only_in_range_values_on_real_data(features):
    assert features['SPEED_THROUGH_WATER'].max() <= 30
    assert features['ME_AVG_RPM'].max() <= 90
    assert features['FULL_SPD_STW_SLIP'].dropna().between(-30, 100).all()
    assert (features[io.FUEL_COLS].fillna(0.0) >= 0).all().all()  # no negative-fuel targets survive


def test_energy_per_hour_target_is_masked_and_derived(features):
    predict = features[features['is_predict']]
    assert predict['target_energy_mj_per_hour'].isna().all()  # a masked label, never given
    single = features[(~features['is_masked']) & features['target_energy_mj'].notna()].head(50)
    expected = single['target_energy_mj'] / single['HOURS_FULL_SPEED']
    assert np.allclose(single['target_energy_mj_per_hour'], expected, equal_nan=True)
