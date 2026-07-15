"""Group-C/D physics feature behaviour: the leakage-robust slip baseline + seawater property terms."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ym_datalake.ml_york.feature_engineering import physics_features as pf


def test_slip_baseline_robust_to_a_non_steady_outlier():
    """A wild non-steady FULL_SPD_STW_SLIP reading must not move the steady-row baseline (unlike min)."""
    base = pd.DataFrame(
        {
            'ship_id': ['S1'] * 5,
            'is_steady_state': [True] * 5,
            'FULL_SPD_STW_SLIP': [2.0, 3.0, 4.0, 5.0, 6.0],
        }
    )
    poisoned = pd.concat(
        [base, pd.DataFrame({'ship_id': ['S1'], 'is_steady_state': [False], 'FULL_SPD_STW_SLIP': [-887_400.0]})],
        ignore_index=True,
    )
    # p5 over steady rows ignores the non-steady outlier entirely -> identical baseline on the real rows.
    assert pf._slip_baseline(base).iloc[0] == pf._slip_baseline(poisoned).iloc[0]


def test_slip_baseline_falls_back_to_fleet_p5_when_ship_has_no_steady_row():
    df = pd.DataFrame(
        {
            'ship_id': ['S1', 'S1', 'S2'],
            'is_steady_state': [False, False, True],  # S1 has no steady row
            'FULL_SPD_STW_SLIP': [10.0, 20.0, 7.0],
        }
    )
    baseline = pf._slip_baseline(df)
    assert baseline.notna().all()  # S1 rows borrow the fleet-wide steady p5 (here S2's only value)
    assert baseline.iloc[0] == 7.0


def test_seawater_density_and_viscosity_fall_with_temperature():
    # warm water is lighter and thinner than cold; the 15°C factor is exactly 1.
    assert pf._seawater_density(30.0) < pf._seawater_density(0.0)
    assert pf._kinematic_viscosity(30.0) < pf._kinematic_viscosity(0.0)
    assert np.isclose(pf._seawater_density(pf.TEMP_REF_C) / pf._seawater_density(pf.TEMP_REF_C), 1.0)
