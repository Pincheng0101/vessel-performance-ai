"""Shared fixtures for the ETL unit tests.

Only real particulars: the ``vessel`` fixture is S1 verbatim from ``dataset/vessel.jsonl``,
so every number a test derives from it stays physically coherent (a 47,700 kW hull really
does need ~25,000 kW for 18 kn). The ``noon_row`` factory returns a day that passes
``filters.is_valid``, so a test can break exactly one field and attribute the failure.
"""

from __future__ import annotations

import pytest

from ym_datalake.schema import NOON_REPORT_COLUMNS


@pytest.fixture
def vessel() -> dict:
    """S1 — hull class W1, propeller variant P1. Copied from dataset/vessel.jsonl."""
    return {
        'imo_number': '9800001',
        'ship_id': 'S1',
        'hull_class': 'W1',
        'role': 'train',
        'vessel_type': 'container',
        'lpp_m': 352.0,
        'breadth_m': 51.0,
        'design_draft_m': 14.5,
        'scantling_draft_m': 15.8,
        'displacement_design_t': 166500.0,
        'displacement_scantling_t': 185900.0,
        'tpc_t_per_cm': 139.2,
        'dwt': 150000.0,
        'mcr_kw': 47700.0,
        'mcr_rpm': 76.0,
        'design_speed_kn': 21.5,
        'propeller_type': 'FPP',
        'propeller_variant': 'P1',
        'pitch_m': 9.8857,
        'transverse_area_m2': 1300.0,
    }


@pytest.fixture
def noon_row():
    """Factory for a **corrected** noon row that passes every ISO 19030 gate for S1.

    Every ``noon_report`` column is present (``clean.clip_row`` indexes them directly),
    null unless the valid day needs a value. ``displacement_source`` / ``mean_draft_m``
    are the two columns ``clean`` adds downstream; ``filters`` reads both.

    ``power_corrected_kw`` is the column ``corrections`` adds, and it is what ``filters``
    gates on (and what ``daily`` computes the speed loss from) — so it carries the same
    value as ``horse_power`` here, exactly as the winning ``convention='none'`` arm leaves
    it. A test that wants to prove the gate and the metric read the *same* field can move
    the two apart.
    """

    def _make(**overrides) -> dict:
        row: dict = {name: None for name, _type in NOON_REPORT_COLUMNS}
        row.update(
            ship_id='S1',
            voyage='V1',
            noon_utc=100,
            masked_flag=False,
            speed_through_water=18.0,
            avg_speed=17.5,
            horse_power=25000.0,  # Admiralty ~706, mid-band
            power_corrected_kw=25000.0,  # convention='none': the measured power, unchanged
            displacement=166500.0,
            displacement_source='measured',
            mean_draft_m=14.5,
            mid_draft=14.5,
            hours_full_speed=24.0,
            hours_total=24.0,
            wind_scale=3.0,
            water_depth=200.0,  # the deep-water floor here is ~82 m
        )
        row.update(overrides)
        return row

    return _make
