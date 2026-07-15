"""Maintenance reset-clock arithmetic + carry-forward encoding, on tiny deterministic fixtures."""

from __future__ import annotations

import math

import pandas as pd
import pytest

from ym_datalake.ml_york.feature_engineering import maintenance as m

MAINT_HEADER = (
    'ship_id,event_type,event_day,propeller_condition,hull_fouling_type,'
    'hull_coating_condition,cavitation_found,draft_fwd_m,draft_aft_m\n'
)


def _events(tmp_path, body: str) -> pd.DataFrame:
    (tmp_path / 'maintenance.csv').write_text(MAINT_HEADER + body, encoding='utf-8')
    return m.load_events(str(tmp_path))


def _run(tmp_path, body: str, days: list[int]) -> pd.DataFrame:
    events = _events(tmp_path, body)
    df = pd.DataFrame({'ship_id': ['S1'] * len(days), 'noon_utc': days, 'VOYAGE': [1] * len(days)})
    return m.add_maintenance_features(df, events).set_index('noon_utc')


# --- pure helpers -------------------------------------------------------------------------------
def test_days_since_reset_anchors_first_cycle_at_data_start():
    clock = m.days_since_reset([0, 5, 12, 20], resets=[10], anchor=0)
    assert clock == {0: 0, 5: 5, 12: 2, 20: 10}  # 0..9 anchored at start, 10+ measured from reset


def test_days_since_reset_inclusive_on_reset_day():
    assert m.days_since_reset([10], resets=[10], anchor=0)[10] == 0


def test_reset_censored_flags_pre_reset_days():
    cens = m.reset_censored([5, 10, 15], resets=[10])
    assert cens == {5: True, 10: False, 15: False}


def test_atom_split_composite_codes():
    assert m._atoms('UWC+PP') == {'UWC', 'PP'}
    assert m._atoms('UWI+PP') == {'UWI', 'PP'}
    assert m._atoms('DD') == {'DD'}


# --- UWI resets nothing (the headline invariant) ------------------------------------------------
def test_uwi_does_not_reset_hull_or_polish(tmp_path):
    out = _run(tmp_path, 'S1,DD,10,,,,,,\nS1,UWI,20,,,,,,\n', days=[10, 25, 30])
    # DD@10 is the only reset; the UWI@20 must NOT restart the hull/polish/dry-dock clocks.
    assert out.loc[30, 'days_since_hull_clean'] == 20
    assert out.loc[30, 'days_since_prop_polish'] == 20
    assert out.loc[30, 'days_since_dry_dock'] == 20
    # ...but the per-type inspection clock still tracks the UWI observation.
    assert out.loc[30, 'days_since_uwi'] == 10


def test_pp_resets_polish_only_not_hull(tmp_path):
    out = _run(tmp_path, 'S1,DD,10,,,,,,\nS1,PP,20,,,,,,\n', days=[25])
    assert out.loc[25, 'days_since_hull_clean'] == 15  # PP leaves the hull clock alone
    assert out.loc[25, 'days_since_prop_polish'] == 5  # PP@20 restarts the polish clock


def test_composite_uwc_pp_resets_both(tmp_path):
    out = _run(tmp_path, 'S1,DD,10,,,,,,\nS1,UWC+PP,20,,,,,,\n', days=[25])
    assert out.loc[25, 'days_since_hull_clean'] == 5  # UWC atom cleans the hull
    assert out.loc[25, 'days_since_prop_polish'] == 5  # PP atom polishes the propeller


def test_service_counts_exclude_pure_inspection(tmp_path):
    out = _run(tmp_path, 'S1,DD,10,,,,,,\nS1,UWI,20,,,,,,\nS1,PP,30,,,,,,\n', days=[35])
    assert out.loc[35, 'n_services_to_date'] == 2  # DD + PP; the UWI is not a service
    assert out.loc[35, 'n_inspections'] == 1
    assert out.loc[35, 'n_drydocks'] == 1


# --- carry-forward findings ---------------------------------------------------------------------
def test_fouling_severity_weights_hard_vs_soft(tmp_path):
    # barnacle(3) + slime(1) = 4 ; carried forward from the observation day onward.
    out = _run(tmp_path, 'S1,UWI,10,,"barnacle,slime",,,,\n', days=[15])
    assert out.loc[15, 'last_fouling_severity'] == 4
    assert out.loc[15, 'had_barnacle'] == 1
    assert out.loc[15, 'had_slime'] == 1
    assert out.loc[15, 'had_algae'] == 0


def test_fouling_set_strips_comma_spaces():
    assert m._fouling_set('barnacle, slime, algae') == {'barnacle', 'slime', 'algae'}


def test_carry_forward_none_before_first_observation(tmp_path):
    out = _run(tmp_path, 'S1,UWI,20,Good,"slime",Good,No,,\n', days=[10, 25])
    assert math.isnan(out.loc[10, 'last_prop_condition'])  # nothing observed yet
    assert out.loc[25, 'last_prop_condition'] == 0  # Good -> 0
    assert out.loc[25, 'last_hull_coating_condition'] == 0
    assert out.loc[25, 'last_cavitation_found'] == 0  # No -> 0


def test_carry_forward_encodings_are_ordinal():
    assert m.CONDITION == {'Good': 0, 'Fair': 1, 'Poor': 2}
    assert m.CAVITATION == {'Yes': 1, 'No': 0}
    assert m.FOULING_WEIGHT['barnacle'] == 3 and m.FOULING_WEIGHT['slime'] == 1


@pytest.mark.parametrize('kind,expected', [('severity', 5), ('calcium', 1), ('barnacle', 0)])
def test_carry_fouling_kinds(kind, expected):
    observed = [(10, {'calcium', 'algae', 'slime'})]  # 2 + 1 + 1 = 4? calcium2+algae1+slime1=4
    # recompute expected weight explicitly to avoid a stale literal
    if kind == 'severity':
        expected = 2 + 1 + 1
    assert m._carry_fouling(observed, 12, kind=kind) == expected
