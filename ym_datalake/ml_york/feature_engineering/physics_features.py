"""Groups C & D — hydro/speed and weather/added-resistance features from ``vt_fd`` A columns only.

Physics enters as *formulas*, re-implemented inline with vt_fd inputs; no fitted exponent, no vessel
particular (breadth/LPP), no hydrostatic table. Anything needing a vessel dimension (apparent wind,
ISO wave resistance) is deliberately excluded — those constants are synthetic and banned.

Rationale: ME fuel ~ SFOC.power, and power ~ displacement^(2/3).STW^3 for a clean hull. So
``admiralty_fuel_proxy = disp^(2/3).STW^3`` is the clean-hull baseline (expected strongest predictor),
and efficiency terms (``speed_per_rpm``, slip) fall as the hull/propeller foul.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

G = 9.80665  # m/s^2
KN_TO_MS = 0.514444  # 1 knot in m/s
FROUDE_DEPTH_COEF = 2.75  # shallow-water critical-depth term:  h_crit = 2.75 . V^2 / g
TEMP_REF_C = 15.0  # biofouling-neutral reference for temp deviation

DIRECTION_COLS = {'wind': 'WIND_DIRECTION', 'sea': 'SEA_DIRECTION', 'swell': 'SWELL_DIRECTION'}

# Seawater density (kg/m^3) at 35 PSU as a quadratic in temperature (°C), fit to EOS-80 reference
# points; and kinematic viscosity (m^2/s) at 35 PSU, likewise quadratic. Warm water is lighter and
# thinner -> slightly less resistance, and a higher Reynolds number for the same speed/draft.
RHO_COEF = (1028.11, -0.07717, -0.004517)
NU_COEF = (1.83e-6, -5.267e-8, 6.67e-10)


def _seawater_density(temp_c):
    a, b, c = RHO_COEF
    return a + b * temp_c + c * temp_c**2


def _kinematic_viscosity(temp_c):
    a, b, c = NU_COEF
    return a + b * temp_c + c * temp_c**2


def add_physics_features(df: pd.DataFrame) -> pd.DataFrame:
    """Attach all group-C (hydro/speed) and group-D (weather) columns."""
    out = pd.DataFrame(index=df.index)
    _hydro(df, out)
    _speed(df, out)
    _weather(df, out)
    return pd.concat([df, out], axis=1)


def _hydro(df: pd.DataFrame, out: pd.DataFrame) -> None:
    out['mean_draft'] = (df['FORE_DRAFT'] + df['AFTER_DRAFT']) / 2.0
    out['trim'] = df['AFTER_DRAFT'] - df['FORE_DRAFT']  # +ve = trim by stern
    out['trim_abs'] = out['trim'].abs()
    out['mid_draft'] = df['MID_DRAFT'].fillna(out['mean_draft'])

    disp = _impute_displacement(df, out['mean_draft'])
    out['displacement_filled'] = disp
    out['displacement_missing'] = df['DISPLACEMENT'].isna().astype(int)
    out['displacement_23'] = np.power(disp, 2.0 / 3.0)
    out['cargo'] = df['CARGO_ON_BOARD']
    out['depth_draft_ratio'] = df['WATER_DEPTH'] / out['mean_draft']

    # Loading state (cargo relative to that ship's own observed peak) and hull-form proxies.
    ship_max_cargo = df.groupby('ship_id')['CARGO_ON_BOARD'].transform('max')
    out['cargo_utilization'] = _safe_div(out['cargo'], ship_max_cargo)
    out['is_laden'] = (out['cargo_utilization'] > 0.5).astype(int)
    out['wetted_proxy'] = _safe_div(disp, out['mean_draft'])  # displacement / draft ~ Lpp . B
    out['trim_ratio'] = _safe_div(out['trim'], out['mean_draft'])


def _impute_displacement(df: pd.DataFrame, mean_draft: pd.Series) -> pd.Series:
    """DISPLACEMENT where present, else a per-ship linear draft regression fit on that ship's own rows.

    Falls back to the ship's median displacement (then the global median) when a ship lacks two
    distinct-draft observations. All inputs are vt_fd — no hydrostatic table.
    """
    disp = df['DISPLACEMENT'].copy()
    global_median = disp.median()
    for _, idx in df.groupby('ship_id').groups.items():
        d = disp.loc[idx]
        if d.notna().all():
            continue
        x, y = mean_draft.loc[idx], d
        fit = x.notna() & y.notna()
        pred = None
        if fit.sum() >= 2 and x[fit].nunique() >= 2:
            slope, intercept = np.polyfit(x[fit], y[fit], 1)
            pred = slope * x + intercept
        ship_median = y.median()
        filled = d.copy()
        if pred is not None:
            filled = filled.fillna(pred)
        filled = filled.fillna(ship_median).fillna(global_median)
        disp.loc[idx] = filled
    return disp


def _speed(df: pd.DataFrame, out: pd.DataFrame) -> None:
    stw = df['SPEED_THROUGH_WATER']
    sog = df['AVG_SPEED']
    rpm = df['ME_AVG_RPM']

    prop_speed = df['PROPELLER_SPEED']
    out['stw'] = stw
    out['sog'] = sog
    out['rpm'] = rpm
    out['prop_speed'] = prop_speed
    out['stw2'] = stw**2
    out['stw3'] = stw**3
    out['rpm2'] = rpm**2
    out['rpm3'] = rpm**3
    out['prop_speed3'] = prop_speed**3
    out['admiralty_fuel_proxy'] = out['displacement_23'] * out['stw3']
    out['speed_per_rpm'] = _safe_div(stw, rpm)  # efficiency; drops when fouled
    out['stw_minus_sog'] = stw - sog
    # Hidden-power surrogates: shaft power ~ rpm^3, and advance/slip ratios expose propeller loading.
    out['apparent_advance'] = _safe_div(stw, prop_speed)  # advance coefficient proxy
    out['slip_ratio'] = _safe_div(rpm, prop_speed)
    out['rpm2_stw'] = out['rpm2'] * stw

    out['full_spd_stw_slip'] = df['FULL_SPD_STW_SLIP']
    out['diff_stw_sog_slip'] = df['DIFF_STW_SOG_SLIP']  # current proxy
    out['slip_excess'] = df['FULL_SPD_STW_SLIP'] - _slip_baseline(df)

    out['sea_speed_fraction'] = _safe_div(df['SEA_SPEED_DISTANCE'], df['TOTAL_DISTANCE'])
    out['total_distance'] = df['TOTAL_DISTANCE']

    stw_ms = stw * KN_TO_MS
    out['froude_depth'] = FROUDE_DEPTH_COEF * stw_ms**2 / G  # critical depth (m) for this speed
    out['shallow_flag'] = (df['WATER_DEPTH'] < out['froude_depth']).astype(int)
    out['water_depth'] = df['WATER_DEPTH']

    out['hours_full_speed'] = df['HOURS_FULL_SPEED']
    out['wind_scale'] = df['WIND_SCALE']


def _weather(df: pd.DataFrame, out: pd.DataFrame) -> None:
    """~81 % filled; per-ship-median impute with explicit missing flags, then derived resistance proxies."""
    out['weather_missing'] = (df['SEA_HEIGHT'].isna() | df['WIND_SPEED'].isna()).astype(int)
    out['sea_water_temp_missing'] = df['SEA_WATER_TEMP'].isna().astype(int)

    wind_speed = _ship_median_impute(df, 'WIND_SPEED')
    sea_height = _ship_median_impute(df, 'SEA_HEIGHT')
    swell_height = _ship_median_impute(df, 'SWELL_HEIGHT')
    sea_temp = _ship_median_impute(df, 'SEA_WATER_TEMP')

    out['wind_speed'] = wind_speed
    out['wind_speed2'] = wind_speed**2
    out['sea_height'] = sea_height
    out['sea_height2'] = sea_height**2
    out['swell_height'] = swell_height
    out['combined_wave'] = np.hypot(sea_height, swell_height)
    out['sea_water_temp'] = sea_temp
    out['temp_dev'] = sea_temp - TEMP_REF_C

    # Seawater property terms: density (buoyancy/power) and a Reynolds proxy (viscous-drag regime).
    density = _seawater_density(sea_temp)
    kin_visc = _kinematic_viscosity(sea_temp)
    out['density'] = density
    out['density_factor'] = density / _seawater_density(TEMP_REF_C)
    out['kin_visc'] = kin_visc
    out['reynolds_proxy'] = _safe_div(out['stw'] * KN_TO_MS * out['mean_draft'], kin_visc)

    # Compass point (0-15) -> radians via 22.5 deg/point; directions imputed to the ship median point.
    rad = {}
    for name, col in DIRECTION_COLS.items():
        pt = _ship_median_impute(df, col)
        theta = np.deg2rad(pt * 22.5)
        rad[name] = theta
        out[f'{name}_dir_sin'] = np.sin(theta)
        out[f'{name}_dir_cos'] = np.cos(theta)

    # Direction is treated as relative-to-bow (true heading unknown — ambiguity noted): head = mag.cos.
    out['head_wind'] = wind_speed * np.cos(rad['wind'])
    out['beam_wind'] = wind_speed * np.sin(rad['wind'])
    out['head_sea'] = sea_height * np.cos(rad['sea'])
    out['beam_sea'] = sea_height * np.sin(rad['sea'])
    out['head_sea_sq'] = sea_height**2 * np.clip(np.cos(rad['sea']), 0.0, None)  # added-resistance proxy


def _slip_baseline(df: pd.DataFrame) -> pd.Series:
    """Per-ship clean-hull slip reference = the 5th percentile of ``FULL_SPD_STW_SLIP`` over that
    ship's steady-state rows (a lower bound robust to outliers, unlike the raw per-ship minimum which
    one bad reading poisons ship-wide). Ships with no steady-state row fall back to the fleet p5.
    """
    steady = df.loc[df['is_steady_state']]
    ship_p5 = steady.groupby('ship_id')['FULL_SPD_STW_SLIP'].quantile(0.05)
    global_p5 = steady['FULL_SPD_STW_SLIP'].quantile(0.05)
    return df['ship_id'].map(ship_p5).fillna(global_p5)


def _ship_median_impute(df: pd.DataFrame, col: str) -> pd.Series:
    ship_median = df.groupby('ship_id')[col].transform('median')
    return df[col].fillna(ship_median).fillna(df[col].median())


def _safe_div(num: pd.Series, den: pd.Series) -> pd.Series:
    return num / den.where(den != 0)
