import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3] / 'scripts'))

import build_model_ready_data as bmd


def test_compute_unified_target_uses_total_weighted_energy() -> None:
    row = {
        'ME_FULLSPEED_CONSUMP_HSHFO': '10',
        'ME_FULLSPEED_CONSUMP_LSMGO': '5',
    }

    expected = 10 * 40.2 + 5 * 42.7
    assert bmd.compute_unified_target_value(row) == pytest.approx(expected)


def test_convert_total_energy_to_fuel_amount_uses_heat_value() -> None:
    total_energy = 100.0
    fuel_type = 'ME_FULLSPEED_CONSUMP_HSHFO'

    expected = total_energy / 40.2
    assert bmd.convert_total_energy_to_fuel_amount(total_energy, fuel_type) == pytest.approx(expected)
