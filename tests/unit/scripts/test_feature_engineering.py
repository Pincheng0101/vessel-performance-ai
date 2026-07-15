import math
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3] / 'scripts'))

import feature_engineering as fe


def test_encode_compass_direction_cardinal_points() -> None:
    # index 0 = North, index 4 = East (90 deg), index 8 = South (180 deg).
    assert fe.encode_compass_direction(0) == pytest.approx((0.0, 1.0), abs=1e-9)
    assert fe.encode_compass_direction(4) == pytest.approx((1.0, 0.0), abs=1e-9)
    assert fe.encode_compass_direction(8) == pytest.approx((0.0, -1.0), abs=1e-9)


def test_encode_compass_direction_wraps_around() -> None:
    def dist(a: tuple[float, float], b: tuple[float, float]) -> float:
        return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

    p0 = fe.encode_compass_direction(0)
    p1 = fe.encode_compass_direction(1)
    p15 = fe.encode_compass_direction(15)
    assert dist(p15, p0) == pytest.approx(dist(p0, p1), abs=1e-9)


def test_encode_compass_direction_missing_maps_to_origin() -> None:
    assert fe.encode_compass_direction(None) == (0.0, 0.0)


def test_clip_clamps_to_bounds() -> None:
    assert fe.clip(671576.0, 'DISPLACEMENT') == 200000.0
    assert fe.clip(98.0, 'SPEED_THROUGH_WATER') == 30.0
    assert fe.clip(-5.0, 'SEA_HEIGHT') == 0.0
    assert fe.clip(14.0, 'FORE_DRAFT') == 14.0  # within bounds, unchanged
    assert fe.clip(123.0, 'NOT_A_COLUMN') == 123.0  # no bounds -> no-op


def test_parse_fouling_species_is_order_and_space_insensitive() -> None:
    assert fe.parse_fouling_species('barnacle,slime,algae') == {'barnacle', 'slime', 'algae'}
    assert fe.parse_fouling_species('slime, barnacle') == {'barnacle', 'slime'}
    assert fe.parse_fouling_species('') == set()
    assert fe.parse_fouling_species(None) == set()


def _base_row() -> dict[str, str]:
    return {
        'De-identification Name': 'S1',
        'SPEED_THROUGH_WATER': '20',
        'AVG_SPEED': '19',
        'ME_AVG_RPM': '70',
        'DISPLACEMENT': '150000',
        'FORE_DRAFT': '14',
        'AFTER_DRAFT': '13',
        'MID_DRAFT': '13.5',
        'HOURS_FULL_SPEED': '23',
        'WIND_SPEED': '10',
        'SEA_HEIGHT': '3',
        'SWELL_HEIGHT': '4',
        'WATER_DEPTH': '5000',
        'CARGO_ON_BOARD': '120000',
        'WIND_DIRECTION': '0',
        'SEA_DIRECTION': '0',
        'SWELL_DIRECTION': '0',
        'days_since_last_cleaning': '100',
        'last_maintenance_hull_fouling_type': 'slime, barnacle',
    }


def test_engineer_row_tier1_physics() -> None:
    out = fe.engineer_row(_base_row())

    assert float(out['stw_cubed']) == pytest.approx(20**3)
    assert float(out['stw_cubed_x_full_speed_hours']) == pytest.approx(20**3 * 23)
    assert float(out['admiralty_power_term']) == pytest.approx(150000 ** (2 / 3) * 20**3)
    assert float(out['rpm_cubed']) == pytest.approx(70**3)


def test_engineer_row_tier2_loading() -> None:
    out = fe.engineer_row(_base_row())

    assert float(out['trim_m']) == pytest.approx(1.0)  # 14 - 13
    assert float(out['mean_draft_m']) == pytest.approx(13.5)


def test_engineer_row_tier3_weather_components() -> None:
    out = fe.engineer_row(_base_row())

    # direction index 0 -> (sin, cos) = (0, 1): longitudinal = magnitude, beam = 0.
    assert float(out['wind_long']) == pytest.approx(10.0)
    assert float(out['wind_beam']) == pytest.approx(0.0)
    assert float(out['sea_height_sq']) == pytest.approx(9.0)
    assert float(out['combined_wave_height']) == pytest.approx(math.sqrt(3**2 + 4**2))


def test_engineer_row_tier4_fouling() -> None:
    out = fe.engineer_row(_base_row())

    assert float(out['days_since_cleaning_sqrt']) == pytest.approx(10.0)
    assert float(out['days_since_cleaning_log']) == pytest.approx(math.log1p(100))
    assert float(out['fouling_x_load']) == pytest.approx(100 * 20**3)
    assert out['fouling_barnacle'] == '1'
    assert out['fouling_slime'] == '1'
    assert out['fouling_algae'] == '0'


def test_engineer_row_tier7_clip_and_missing_flags() -> None:
    row = _base_row()
    row['DISPLACEMENT'] = '671576'  # impossible outlier
    row['SEA_WATER_TEMP'] = ''  # missing
    out = fe.engineer_row(row)

    assert float(out['DISPLACEMENT']) == 200000.0  # clipped in place
    assert out['DISPLACEMENT_is_missing'] == '0'
    assert out['SEA_WATER_TEMP_is_missing'] == '1'
    assert out['MID_DRAFT_is_missing'] == '0'


def test_engineer_row_has_no_vessel_derived_columns() -> None:
    out = fe.engineer_row(_base_row())
    for col in (
        'real_slip',
        'draft_to_design_ratio',
        'is_laden',
        'cargo_to_dwt_ratio',
        'deep_water_min_m',
        'water_depth_to_min_ratio',
        'is_shallow_water',
        'hull_class',
        'propeller_variant',
        'pitch_m',
    ):
        assert col not in out


def test_engineered_columns_match_engineer_row_keys() -> None:
    out = fe.engineer_row(_base_row())
    for col in fe.ENGINEERED_COLUMNS:
        assert col in out, f'{col} missing from engineer_row output'
