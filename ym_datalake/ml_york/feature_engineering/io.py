"""Load and clean ``vt_fd.csv`` + ``maintenance.csv``; derive flags, targets and fuel features.

Column classes are re-declared here from the README A/H/T/F table (not imported from the curated
lake). ``HIDDEN`` / ``PREDICT`` markers are parsed *before* numeric coercion so the masked-window
flags survive, then every measurement column is coerced to numeric with those markers -> NaN.
"""

from __future__ import annotations

import pandas as pd

# --- README column classes (A visible / H hidden / T hidden-or-predict / F visible helper) --------
A_COLS = [
    'VOYAGE',
    'NOON_UTC',
    'AVG_SPEED',
    'SPEED_THROUGH_WATER',
    'ME_AVG_RPM',
    'PROPELLER_SPEED',
    'FORE_DRAFT',
    'AFTER_DRAFT',
    'DISPLACEMENT',
    'CARGO_ON_BOARD',
    'WIND_SCALE',
    'WIND_SPEED',
    'WIND_DIRECTION',
    'SEA_HEIGHT',
    'SEA_DIRECTION',
    'SWELL_HEIGHT',
    'SWELL_DIRECTION',
    'SEA_WATER_TEMP',
    'WATER_DEPTH',
    'MID_DRAFT',
    'TOTAL_DISTANCE',
    'SEA_SPEED_DISTANCE',
    'DIFF_STW_SOG_SLIP',
    'FULL_SPD_STW_SLIP',
]
# The 40 columns of vt_fd.csv, in file order — the output CSV preserves these ahead of engineered cols.
ORIGINAL_COLUMNS = [
    'De-identification Name',
    'VOYAGE',
    'NOON_UTC',
    'AVG_SPEED',
    'SPEED_THROUGH_WATER',
    'ME_AVG_RPM',
    'PROPELLER_SPEED',
    'FORE_DRAFT',
    'AFTER_DRAFT',
    'DISPLACEMENT',
    'CARGO_ON_BOARD',
    'WIND_SCALE',
    'SEA_HEIGHT',
    'SEA_WATER_TEMP',
    'WIND_SPEED',
    'WIND_DIRECTION',
    'SWELL_HEIGHT',
    'SWELL_DIRECTION',
    'SEA_DIRECTION',
    'WATER_DEPTH',
    'MID_DRAFT',
    'TOTAL_DISTANCE',
    'SEA_SPEED_DISTANCE',
    'DIFF_STW_SOG_SLIP',
    'FULL_SPD_STW_SLIP',
    'HORSE_POWER',
    'LOAD_PCT',
    'SFOC',
    'ME_SLIP',
    'THRUST',
    'THRUST_QUOTIENT',
    'TOTAL_CONSUMP',
    'ME_CONSUMPTION',
    'ME_FULLSPEED_CONSUMP_HSHFO',
    'ME_FULLSPEED_CONSUMP_ULSFO',
    'ME_FULLSPEED_CONSUMP_VLSFO',
    'ME_FULLSPEED_CONSUMP_LSMGO',
    'ME_FULLSPEED_CONSUMP_BIO_HSFO',
    'HOURS_FULL_SPEED',
    'HOURS_TOTAL',
]

H_COLS = ['HORSE_POWER', 'LOAD_PCT', 'SFOC', 'ME_SLIP', 'THRUST', 'THRUST_QUOTIENT']
FUEL_COLS = [
    'ME_FULLSPEED_CONSUMP_HSHFO',
    'ME_FULLSPEED_CONSUMP_ULSFO',
    'ME_FULLSPEED_CONSUMP_VLSFO',
    'ME_FULLSPEED_CONSUMP_LSMGO',
    'ME_FULLSPEED_CONSUMP_BIO_HSFO',
]
T_COLS = ['TOTAL_CONSUMP', 'ME_CONSUMPTION'] + FUEL_COLS
F_COLS = ['WIND_SCALE', 'HOURS_FULL_SPEED']  # also count HOURS_TOTAL as an operational passthrough
SHIP_COL = 'De-identification Name'

# H + all-T are the leakage set: present in the CSV as labels, banned as model inputs.
LEAKAGE_COLS = H_COLS + T_COLS

# fuel column -> short key; short key -> LCV (MJ/kg), README 燃料熱值對照 table (re-declared locally).
FUEL_KEY = {c: c.removeprefix('ME_FULLSPEED_CONSUMP_') for c in FUEL_COLS}
KEY_FUEL = {k: c for c, k in FUEL_KEY.items()}
LCV = {'HSHFO': 40.2, 'ULSFO': 41.2, 'VLSFO': 40.2, 'LSMGO': 42.7, 'BIO_HSFO': 39.4}

# README ship-type grouping: W1 = S1..S8 + S21 ; W2 = S9..S12 + S22, S23 (sister designs, diff routes).
SHIP_TYPE = {
    **{f'S{i}': 'W1' for i in range(1, 9)},
    'S21': 'W1',
    **{f'S{i}': 'W2' for i in range(9, 13)},
    'S22': 'W2',
    'S23': 'W2',
}

# README steady-state gate for the PREDICT cells (also a training-weight filter).
STEADY_HOURS_MIN = 22.0
STEADY_WIND_SCALE_MAX = 4.0

# Physical-plausibility bounds (README units): a reading outside its range is a sensor/logging error,
# set to NaN so the existing per-ship imputation + steady-state gate handle it — never clamped, which
# would invent a boundary value. Fuel columns only reject negative mass (see _clip_physical).
_PHYSICAL_BOUNDS = {
    'SPEED_THROUGH_WATER': (0.0, 30.0),
    'AVG_SPEED': (0.0, 30.0),
    'ME_AVG_RPM': (0.0, 90.0),
    'PROPELLER_SPEED': (0.0, 45.0),
    'FORE_DRAFT': (0.0, 20.0),
    'AFTER_DRAFT': (0.0, 20.0),
    'MID_DRAFT': (0.0, 20.0),
    'DISPLACEMENT': (30_000.0, 200_000.0),
    'CARGO_ON_BOARD': (0.0, 155_000.0),
    'WIND_SPEED': (0.0, 80.0),
    'SEA_HEIGHT': (0.0, 20.0),
    'SWELL_HEIGHT': (0.0, 20.0),
    'WATER_DEPTH': (0.0, 12_000.0),
    'FULL_SPD_STW_SLIP': (-30.0, 100.0),
    'DIFF_STW_SOG_SLIP': (-15.0, 15.0),
}


def load_vt_fd(data_dir: str) -> pd.DataFrame:
    """Read ``vt_fd.csv``, drop the 63 exact-duplicate rows, and attach flags/targets/fuel features.

    Returns a frame whose original 40 columns are numeric (``HIDDEN``/``PREDICT`` -> NaN) plus:
    keys (``ship_id``, ``noon_utc``, ``ship_type``), flags (``is_masked``/``is_predict``/
    ``is_steady_state``), targets (NaN on masked rows) and the group-F fuel features.
    """
    raw = pd.read_csv(f'{data_dir}/vt_fd.csv', encoding='utf-8-sig', dtype=str)
    raw = raw.drop_duplicates().reset_index(drop=True)

    # Markers must be read off the raw strings before coercion nulls them.
    is_predict = (raw[FUEL_COLS] == 'PREDICT').any(axis=1)
    is_masked = (raw[H_COLS + T_COLS] == 'HIDDEN').any(axis=1) | is_predict

    df = raw.copy()
    for col in df.columns:
        if col != SHIP_COL:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    _clip_physical(df)  # out-of-range readings -> NaN before any feature (or target) reads them

    fuel_num = df[FUEL_COLS]  # coerced + negative-mass-clipped; feeds both fuel identity and targets
    target_fuel_type = _target_fuel_type(raw, fuel_num, is_predict)

    df['ship_id'] = df[SHIP_COL].astype(str)
    df['noon_utc'] = df['NOON_UTC'].astype(int)
    df['ship_type'] = df['ship_id'].map(SHIP_TYPE)
    df['is_masked'] = is_masked.to_numpy()
    df['is_predict'] = is_predict.to_numpy()
    df['is_steady_state'] = (df['HOURS_FULL_SPEED'] >= STEADY_HOURS_MIN) & (df['WIND_SCALE'] <= STEADY_WIND_SCALE_MAX)
    df['target_fuel_type'] = target_fuel_type.to_numpy()

    _attach_targets(df, fuel_num, is_masked)
    _attach_fuel_features(df)
    return df


def _clip_physical(df: pd.DataFrame) -> None:
    """Set physically-impossible readings to NaN in place (never clamp — imputation fills the gap).

    Bounded columns outside ``[lo, hi]`` become NaN; fuel columns reject only negative mass (their
    upper tail is a real signal), which also kills negative-fuel training targets. Columns absent from
    ``df`` are skipped so the helper is usable on partial frames in tests.
    """
    for col, (lo, hi) in _PHYSICAL_BOUNDS.items():
        if col in df.columns:
            s = df[col]
            df[col] = s.where((s >= lo) & (s <= hi))
    for col in FUEL_COLS:
        if col in df.columns:
            s = df[col]
            df[col] = s.where(s >= 0)


def _target_fuel_type(raw: pd.DataFrame, fuel_num: pd.DataFrame, is_predict: pd.Series) -> pd.Series:
    """Short fuel key per row: the ``PREDICT``-marked column on predict rows, else the dominant fuel.

    "Dominant" = the fuel column carrying the largest positive mass that day; NaN when no fuel
    column is positive (e.g. a masked non-predict row where every fuel cell is ``HIDDEN``).
    """
    predict_col = (raw[FUEL_COLS] == 'PREDICT').idxmax(axis=1).where(is_predict)

    positive = fuel_num.where(fuel_num > 0)
    has_positive = positive.notna().any(axis=1)
    dominant_col = pd.Series(index=fuel_num.index, dtype=object)
    dominant_col.loc[has_positive] = positive.loc[has_positive].idxmax(axis=1)  # skip all-NA rows

    col = predict_col.where(is_predict, dominant_col)
    return col.map(FUEL_KEY)


def _attach_targets(df: pd.DataFrame, fuel_num: pd.DataFrame, is_masked: pd.Series) -> None:
    """Targets (labels, never inputs), NaN on every masked row so the 102 predict cells stay unlabelled.

    ``target_me_fs_consump`` is the day's total ME full-speed fuel mass (summed across fuels so a
    multi-fuel training day is captured); ``target_energy_mj`` unifies the fuels by LCV so days on
    different fuels are comparable; ``*_per_hour`` applies the README full-speed-hours correction.
    """
    mass = fuel_num.sum(axis=1, min_count=1)
    # NaN-skipping sum (like mass): most rows leave BIO_HSFO NaN, and `+` would poison the whole row.
    energy_parts = pd.DataFrame({c: fuel_num[c] * LCV[FUEL_KEY[c]] for c in FUEL_COLS})
    energy = energy_parts.sum(axis=1, min_count=1)

    keep = ~is_masked.to_numpy()
    df['target_me_fs_consump'] = mass.where(keep)
    df['target_energy_mj'] = energy.where(keep)
    df['target_me_fs_consump_per_hour'] = df['target_me_fs_consump'] / df['HOURS_FULL_SPEED']
    df['target_energy_mj_per_hour'] = df['target_energy_mj'] / df['HOURS_FULL_SPEED']


def _attach_fuel_features(df: pd.DataFrame) -> None:
    """Group F: fuel one-hot + LCV. Predict-safe — the fuel identity is *given* on predict rows.

    On masked non-predict rows ``target_fuel_type`` is NaN, so every one-hot is 0 and ``fuel_lcv``
    is NaN; those rows carry no target and are excluded from training anyway.
    """
    for key in LCV:
        df[f'fuel_is_{key.lower()}'] = (df['target_fuel_type'] == key).astype(int)
    df['fuel_lcv'] = df['target_fuel_type'].map(LCV)


def fuel_feature_columns() -> list[str]:
    return [f'fuel_is_{key.lower()}' for key in LCV] + ['fuel_lcv']
