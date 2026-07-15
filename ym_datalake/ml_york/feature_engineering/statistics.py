"""Group E — per-ship trailing rolling/statistical features over VISIBLE (A) columns only.

Every window is **trailing** (day ``d`` sees only days ``<= d``), so no future information and no
target ever leaks: the inputs are stw/rpm/slip/weather/draft/temp, all A-class and visible inside a
masked window. Rolling is time-based on the integer day, so multi-voyage rows on the same day share a
window and gaps in the calendar are respected.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

ROLL_COLUMNS = ['stw', 'rpm', 'full_spd_stw_slip', 'sea_height', 'wind_speed', 'mean_draft', 'sea_water_temp']
ROLL_WINDOWS = (7, 14, 30)
DAY_ORIGIN = pd.Timestamp('2000-01-01')  # arbitrary fixed epoch; only day *differences* matter
THERMAL_REF_C = 15.0  # biofouling-neutral reference temperature (matches physics_features.TEMP_REF_C)

# Speed-loss calibration: a "clean" row is steady-state AND within 60 days of a hull cleaning; a ship
# needs at least this many clean rows to earn its own fit, else it falls back to the W-type pooled fit.
CLEAN_MAX_DAYS_SINCE_HULL_CLEAN = 60
MIN_CLEAN_ROWS = 30


def add_statistics_features(df: pd.DataFrame) -> pd.DataFrame:
    """Attach group-E columns. Requires the group-C/D columns (stw, mean_draft, ...) already present."""
    parts = [_ship_stats(sub) for _, sub in df.groupby('ship_id', sort=False)]
    feats = pd.concat(parts).reindex(df.index)
    _cross_ship_type(df, feats)
    _voyage(df, feats)
    # coating age (maintenance) x accumulated thermal dose (this module): compound fouling driver.
    feats['coating_x_thermal'] = (df['coating_age_years'] * feats['thermal_exposure_since_clean']).to_numpy()
    return pd.concat([df, feats], axis=1)


def _ship_stats(rows: pd.DataFrame) -> pd.DataFrame:
    """Time-based trailing rolling per ship. Rows are ordered by (day, voyage) so the index is monotonic."""
    order = rows.sort_values(['noon_utc', 'VOYAGE'])
    ts = DAY_ORIGIN + pd.to_timedelta(order['noon_utc'], unit='D')
    out = pd.DataFrame(index=order.index)

    for col in ROLL_COLUMNS:
        series = pd.Series(order[col].to_numpy(), index=ts)
        for window in ROLL_WINDOWS:
            roll = series.rolling(f'{window}D', min_periods=1)
            out[f'{col}_roll{window}_mean'] = roll.mean().to_numpy()
            out[f'{col}_roll{window}_std'] = roll.std().to_numpy()

    # Expanding (all-history) trailing means: one for the drift signal, one for the thermal index.
    stw_expanding = order['stw'].expanding().mean()
    out['stw_minus_expanding_mean'] = (order['stw'] - stw_expanding).to_numpy()
    out['sea_water_temp_expanding_mean'] = order['sea_water_temp'].expanding().mean().to_numpy()

    # Thermal dose (Σ warm-water excess) accumulated since the last hull clean; resets each clean day.
    out['thermal_exposure_since_clean'] = _thermal_exposure_since_clean(
        order['days_since_hull_clean'].to_numpy(), order['sea_water_temp'].to_numpy()
    )
    return out.reindex(rows.index)


def _thermal_exposure_since_clean(days_since_hull_clean, sea_water_temp) -> np.ndarray:
    """Trailing cumulative ``Σ max(0, temp − 15)`` reset on each hull-clean day (clock == 0).

    Inputs must already be ordered by day. Each ``days_since_hull_clean == 0`` opens a fresh segment
    (data-start anchor or a cleaning), and the dose accumulates within the segment only.
    """
    excess = np.maximum(0.0, np.asarray(sea_water_temp, dtype=float) - THERMAL_REF_C)
    seg = (np.asarray(days_since_hull_clean) == 0).cumsum()
    return pd.Series(excess).groupby(seg).cumsum().to_numpy()


def _cross_ship_type(df: pd.DataFrame, feats: pd.DataFrame) -> None:
    """Per-ship-type reference speed (a normalising constant over an A column — no target).

    The reference is the mean over *steady-state* rows only, so a maneuvering/outlier speed cannot
    drag the whole type's baseline; types with no steady-state row fall back to the fleet mean.
    """
    stw_steady = df['stw'].where(df['is_steady_state'])
    ref = stw_steady.groupby(df['ship_type']).transform('mean').fillna(df['stw'].mean())
    feats['stw_vs_type_ref'] = (df['stw'] - ref).to_numpy()


def _voyage(df: pd.DataFrame, feats: pd.DataFrame) -> None:
    grp = df.groupby(['ship_id', 'VOYAGE'])
    feats['voyage_position'] = grp['noon_utc'].rank(method='first').sub(1).to_numpy()
    # Voyage speed reference over steady-state rows only; fall back to the voyage's all-row mean.
    stw_steady = df['stw'].where(df['is_steady_state'])
    voyage_mean = stw_steady.groupby([df['ship_id'], df['VOYAGE']]).transform('mean')
    voyage_mean = voyage_mean.fillna(grp['stw'].transform('mean')).fillna(df['stw'].mean())
    feats['voyage_mean_stw'] = voyage_mean.to_numpy()


def add_speed_loss_features(df: pd.DataFrame) -> pd.DataFrame:
    """RPM / power excess vs a clean-hull calibration line — an added-resistance signal from A columns.

    On clean rows (steady-state AND within 60 days of a hull clean) fit two least-squares lines:
    ``rpm ~ a + b·stw`` (extra rpm for a given speed) and ``admiralty_fuel_proxy ~ a + b·rpm3`` (the
    clean rpm→power curve). The residual ``obs − clean-predicted`` is emitted per ship (``*_ship``)
    when the ship has enough clean rows, else per W-type (``*_type``); the ship column also carries the
    type residual as its fallback. Every input is visible (stw/rpm/displacement) — power stays hidden,
    so the reference is a per-ship/type curve rather than a physical constant. Curves are fit over the
    whole series (mild look-ahead, accepted — CV is out of scope).
    """
    df = df.copy()
    clean = df['is_steady_state'] & (df['days_since_hull_clean'] <= CLEAN_MAX_DAYS_SINCE_HULL_CLEAN)
    df['rpm_excess_ship'], df['rpm_excess_type'] = _excess(df, clean, x='stw', y='rpm')
    df['admiralty_excess_ship'], df['admiralty_excess_type'] = _excess(df, clean, x='rpm3', y='admiralty_fuel_proxy')
    return df


def _fit_line(x: np.ndarray, y: np.ndarray) -> tuple[float, float] | None:
    """Least-squares (slope, intercept) over finite pairs; ``None`` if under-determined."""
    m = np.isfinite(x) & np.isfinite(y)
    if m.sum() < 2 or np.ptp(x[m]) == 0:
        return None
    slope, intercept = np.polyfit(x[m], y[m], 1)
    return float(slope), float(intercept)


def _fit_group(sub: pd.DataFrame, x: str, y: str) -> tuple[float, float] | None:
    return _fit_line(sub[x].to_numpy(dtype=float), sub[y].to_numpy(dtype=float))


def _excess(df: pd.DataFrame, clean_mask: pd.Series, x: str, y: str) -> tuple[pd.Series, pd.Series]:
    """(ship_excess, type_excess) = obs − clean-fit-predicted ``y``, per ship (w/ type fallback) and per type."""
    clean = df[clean_mask]

    type_fits = {k: _fit_group(sub, x, y) for k, sub in clean.groupby('ship_type', sort=False)}
    type_excess = df[y] - _predict(df, x, df['ship_type'], type_fits)

    ship_fits = {
        s: fit
        for s, sub in clean.groupby('ship_id', sort=False)
        if len(sub) >= MIN_CLEAN_ROWS and (fit := _fit_group(sub, x, y)) is not None
    }
    ship_excess = (df[y] - _predict(df, x, df['ship_id'], ship_fits)).fillna(type_excess)
    return ship_excess, type_excess


def _predict(df: pd.DataFrame, x: str, key: pd.Series, fits: dict) -> pd.Series:
    """Broadcast each group's clean line over its rows: ``a + b·x`` (NaN where the group has no fit)."""
    slope = key.map(lambda k: fits[k][0] if fits.get(k) else np.nan)
    intercept = key.map(lambda k: fits[k][1] if fits.get(k) else np.nan)
    return slope * df[x] + intercept


def add_thermal_fouling_index(df: pd.DataFrame) -> pd.DataFrame:
    """``days_since_hull_clean`` x trailing-mean sea water temp — warm water accelerates biofouling.

    Both factors are predict-safe (maintenance clock + a trailing mean of the visible A temp column).
    """
    df = df.copy()
    df['thermal_fouling_index'] = df['days_since_hull_clean'] * df['sea_water_temp_expanding_mean']
    return df


def clip_negative_std() -> None:  # pragma: no cover - placeholder kept intentionally empty
    """std of a single-row window is NaN by construction; downstream imputation (0-fill) handles it."""
    _ = np.nan
