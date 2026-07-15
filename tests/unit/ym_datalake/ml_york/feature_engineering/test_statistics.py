"""Group-E statistics: thermal-dose reset semantics and the clean-hull speed-loss calibration."""

from __future__ import annotations

from ym_datalake.ml_york.feature_engineering import statistics as st


def test_thermal_exposure_resets_on_clean_day():
    # excess = max(0, temp-15): 5,5,5 then a clean day at the reference (0), then 5 again.
    dsc = [0, 1, 2, 0, 1]  # clock hits 0 on the anchor (idx 0) and the hull-clean day (idx 3)
    temp = [20.0, 20.0, 20.0, 15.0, 20.0]
    out = st._thermal_exposure_since_clean(dsc, temp)
    assert list(out) == [5.0, 10.0, 15.0, 0.0, 5.0]  # dose accumulates, drops to 0 at the clean, restarts


def test_thermal_exposure_ignores_sub_reference_cold_water():
    out = st._thermal_exposure_since_clean([0, 1, 2], [10.0, 14.0, 20.0])  # only the 20°C day contributes
    assert list(out) == [0.0, 0.0, 5.0]


def test_rpm_excess_is_zero_mean_on_clean_rows_by_type(features):
    """OLS residuals sum to zero over the rows the pooled clean line was fit to."""
    clean = features['is_steady_state'] & (features['days_since_hull_clean'] <= st.CLEAN_MAX_DAYS_SINCE_HULL_CLEAN)
    per_type_mean = features.loc[clean].groupby('ship_type')['rpm_excess_type'].mean()
    assert per_type_mean.abs().max() < 1e-6


def test_rpm_excess_ship_is_zero_mean_where_ship_has_its_own_fit(features):
    clean = features['is_steady_state'] & (features['days_since_hull_clean'] <= st.CLEAN_MAX_DAYS_SINCE_HULL_CLEAN)
    counts = features.loc[clean].groupby('ship_id').size()
    own_fit = counts[counts >= st.MIN_CLEAN_ROWS].index  # ships that earned their own line
    sub = features.loc[clean & features['ship_id'].isin(own_fit)]
    per_ship_mean = sub.groupby('ship_id')['rpm_excess_ship'].mean()
    assert per_ship_mean.abs().max() < 1e-6
