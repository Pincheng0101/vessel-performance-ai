#!/usr/bin/env python3
"""Feature engineering for the model-ready dataset.

Derives propulsion-physics, loading, weather and fouling features from a raw voyage row,
and clips physically-impossible source values. All inputs come from vt_fd.csv and the
maintenance-event columns -- nothing here depends on vessel.jsonl, which the real dataset
does not ship.

The ISO 15016 / 19030 formulas here mirror ``ym_datalake/etl/physics.py`` (the canonical
source). They are re-stated locally to keep this stdlib-only pipeline self-contained
(``scripts/`` cannot import the ``ym_datalake`` package when run as a plain script).

The full catalogue of transforms is documented in ``doc/feature-engineering.md``.
"""

from __future__ import annotations

import math
from typing import Any

# --- constants ---------------------------------------------------------------

COMPASS_POINTS = 16

DIRECTION_COLUMNS = ('WIND_DIRECTION', 'SWELL_DIRECTION', 'SEA_DIRECTION')

# Physically-impossible values survive in the source (see doc/dataset.md). Clamp them
# before deriving features so a single garbage row cannot poison speed^3 / admiralty terms.
CLIP_BOUNDS: dict[str, tuple[float, float]] = {
    'AVG_SPEED': (0.0, 30.0),
    'SPEED_THROUGH_WATER': (0.0, 30.0),
    'ME_AVG_RPM': (0.0, 90.0),
    'PROPELLER_SPEED': (0.0, 90.0),
    'FORE_DRAFT': (0.0, 20.0),
    'AFTER_DRAFT': (0.0, 20.0),
    'MID_DRAFT': (0.0, 20.0),
    'DISPLACEMENT': (0.0, 200000.0),
    'CARGO_ON_BOARD': (0.0, 200000.0),
    'WIND_SCALE': (0.0, 12.0),
    'WIND_SPEED': (0.0, 100.0),
    'SEA_HEIGHT': (0.0, 20.0),
    'SWELL_HEIGHT': (0.0, 20.0),
    'WATER_DEPTH': (0.0, 12000.0),
    'TOTAL_DISTANCE': (0.0, 800.0),
    'DIFF_STW_SOG_SLIP': (-20.0, 20.0),
    'FULL_SPD_STW_SLIP': (-100.0, 100.0),
    'HOURS_FULL_SPEED': (0.0, 24.0),
    'HOURS_TOTAL': (0.0, 24.0),
}

# Columns whose missingness may itself be informative (all ~68.5 % filled).
MISSING_FLAG_COLUMNS = ('DISPLACEMENT', 'MID_DRAFT', 'SEA_WATER_TEMP')

# hull_fouling_type is a comma list drawn from these species, in inconsistent order.
FOULING_SPECIES = ('barnacle', 'slime', 'algae', 'tubeworm', 'calcium')

# Derived columns added by engineer_row, in output order. Clipped raw columns reuse their
# original names and are NOT listed here.
ENGINEERED_COLUMNS: list[str] = [
    # cyclic compass encoding
    'WIND_DIRECTION_SIN',
    'WIND_DIRECTION_COS',
    'SWELL_DIRECTION_SIN',
    'SWELL_DIRECTION_COS',
    'SEA_DIRECTION_SIN',
    'SEA_DIRECTION_COS',
    # Tier 1 — propulsion physics
    'stw_cubed',
    'stw_cubed_x_full_speed_hours',
    'admiralty_power_term',
    'rpm_cubed',
    # Tier 2 — loading / draft
    'trim_m',
    'mean_draft_m',
    # Tier 3 — weather added resistance
    'wind_long',
    'wind_beam',
    'sea_long',
    'sea_beam',
    'swell_long',
    'swell_beam',
    'sea_height_sq',
    'swell_height_sq',
    'combined_wave_height',
    # Tier 4 — fouling
    'days_since_cleaning_sqrt',
    'days_since_cleaning_log',
    'fouling_x_load',
    'fouling_barnacle',
    'fouling_slime',
    'fouling_algae',
    'fouling_tubeworm',
    'fouling_calcium',
    # Tier 7 — missingness flags
    'DISPLACEMENT_is_missing',
    'MID_DRAFT_is_missing',
    'SEA_WATER_TEMP_is_missing',
]


# --- low-level helpers -------------------------------------------------------


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if text in {'', 'nan', 'NaN', 'None', 'NULL'}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _fmt(value: float | None) -> str:
    return '' if value is None else str(value)


def clip(value: float, col: str) -> float:
    """Clamp a value to the physical bounds for ``col`` (no-op if col has no bounds)."""

    bounds = CLIP_BOUNDS.get(col)
    if bounds is None:
        return value
    lo, hi = bounds
    return min(max(value, lo), hi)


def encode_compass_direction(index: float | None) -> tuple[float, float]:
    """Encode a 16-point compass index (0-15) as a (sin, cos) pair on the unit circle.

    Adjacent directions (e.g. 15 and 0) map to nearby points, unlike the raw ordinal
    index. Missing values map to the origin (0, 0), which is distinct from every real
    direction (all of which lie on the unit circle).
    """

    if index is None:
        return 0.0, 0.0
    angle = index * (2 * math.pi / COMPASS_POINTS)
    return math.sin(angle), math.cos(angle)


def parse_fouling_species(text: str | None) -> set[str]:
    """Parse hull_fouling_type into a set of species, order/spacing insensitive."""

    if not text:
        return set()
    return {token.strip().lower() for token in str(text).split(',') if token.strip()}


# --- per-row engineering -----------------------------------------------------


def engineer_row(row: dict[str, str]) -> dict[str, str]:
    """Return clipped raw columns plus all derived feature columns for one voyage row."""

    out: dict[str, str] = {}

    # Tier 7 — clip physically-impossible raw values in place.
    clipped: dict[str, float] = {}
    for col in CLIP_BOUNDS:
        value = _to_float(row.get(col))
        if value is not None:
            value = clip(value, col)
            clipped[col] = value
            out[col] = str(value)

    def cv(col: str) -> float | None:
        return clipped[col] if col in clipped else _to_float(row.get(col))

    stw = cv('SPEED_THROUGH_WATER')
    rpm = cv('ME_AVG_RPM')
    disp = cv('DISPLACEMENT')
    fore = cv('FORE_DRAFT')
    aft = cv('AFTER_DRAFT')
    full_hours = cv('HOURS_FULL_SPEED')
    wind = cv('WIND_SPEED')
    sea = cv('SEA_HEIGHT')
    swell = cv('SWELL_HEIGHT')

    # Cyclic compass encoding (also feeds the Tier 3 directional components).
    dir_sin: dict[str, float] = {}
    dir_cos: dict[str, float] = {}
    for col in DIRECTION_COLUMNS:
        sin_val, cos_val = encode_compass_direction(_to_float(row.get(col)))
        out[f'{col}_SIN'] = str(sin_val)
        out[f'{col}_COS'] = str(cos_val)
        dir_sin[col] = sin_val
        dir_cos[col] = cos_val

    # Tier 1 — propulsion physics.
    stw_cubed = stw**3 if stw is not None else None
    out['stw_cubed'] = _fmt(stw_cubed)
    out['stw_cubed_x_full_speed_hours'] = _fmt(
        stw_cubed * full_hours if stw_cubed is not None and full_hours is not None else None
    )
    out['admiralty_power_term'] = _fmt(
        disp ** (2.0 / 3.0) * stw_cubed if disp is not None and disp > 0 and stw_cubed is not None else None
    )
    out['rpm_cubed'] = _fmt(rpm**3 if rpm is not None else None)

    # Tier 2 — loading / draft.
    trim = fore - aft if fore is not None and aft is not None else None
    out['trim_m'] = _fmt(trim)
    mean_draft = (fore + aft) / 2.0 if fore is not None and aft is not None else None
    out['mean_draft_m'] = _fmt(mean_draft)

    # Tier 3 — weather added resistance (longitudinal = head/following, beam = crosswise).
    out['wind_long'] = _fmt(wind * dir_cos['WIND_DIRECTION'] if wind is not None else None)
    out['wind_beam'] = _fmt(wind * dir_sin['WIND_DIRECTION'] if wind is not None else None)
    out['sea_long'] = _fmt(sea * dir_cos['SEA_DIRECTION'] if sea is not None else None)
    out['sea_beam'] = _fmt(sea * dir_sin['SEA_DIRECTION'] if sea is not None else None)
    out['swell_long'] = _fmt(swell * dir_cos['SWELL_DIRECTION'] if swell is not None else None)
    out['swell_beam'] = _fmt(swell * dir_sin['SWELL_DIRECTION'] if swell is not None else None)
    out['sea_height_sq'] = _fmt(sea**2 if sea is not None else None)
    out['swell_height_sq'] = _fmt(swell**2 if swell is not None else None)
    out['combined_wave_height'] = _fmt(math.sqrt(sea**2 + swell**2) if sea is not None and swell is not None else None)

    # Tier 4 — fouling.
    days_since_cleaning = _to_float(row.get('days_since_last_cleaning'))
    non_negative_days = days_since_cleaning if days_since_cleaning is not None and days_since_cleaning >= 0 else None
    out['days_since_cleaning_sqrt'] = _fmt(math.sqrt(non_negative_days) if non_negative_days is not None else None)
    out['days_since_cleaning_log'] = _fmt(math.log1p(non_negative_days) if non_negative_days is not None else None)
    out['fouling_x_load'] = _fmt(
        days_since_cleaning * stw_cubed if days_since_cleaning is not None and stw_cubed is not None else None
    )
    species = parse_fouling_species(row.get('last_maintenance_hull_fouling_type'))
    for name in FOULING_SPECIES:
        out[f'fouling_{name}'] = str(int(name in species))

    # Tier 7 — missingness flags.
    for col in MISSING_FLAG_COLUMNS:
        out[f'{col}_is_missing'] = str(int(_to_float(row.get(col)) is None))

    return out
