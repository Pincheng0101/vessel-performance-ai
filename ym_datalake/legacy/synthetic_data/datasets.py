"""Builders for the simple/static raw datasets and shared dataset constants.

The physics-heavy ``noon_report`` + ground-truth assembly lives in
:mod:`ym_datalake.synthetic_data.generate`; this module builds the datasets that
do not depend on the daily forward model: ``vessel_master``,
``reference_curve`` and the ``fuel_price`` time series.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from ym_datalake.synthetic_data.curves import curve_points
from ym_datalake.synthetic_data.fleet import VesselSpec

# Fuels priced in the fuel_price series (and referenced by noon reports).
FUEL_TYPES = ['HFO', 'VLSFO', 'MGO']

# Starting bunker prices (USD/mt) circa the series start.
_FUEL_BASE_PRICE = {'HFO': 480.0, 'VLSFO': 560.0, 'MGO': 720.0}
_FUEL_VOL = {'HFO': 6.0, 'VLSFO': 7.0, 'MGO': 9.0}


def build_vessel_master(spec: VesselSpec) -> dict:
    """One ``vessel_master`` dimension row (§2.4)."""
    return {
        'imo_number': spec.imo_number,
        'vessel_name': spec.vessel_name,
        'vessel_type': 'container',
        'fleet_id': spec.fleet_id,
        'fleet_name': spec.fleet_name,
        'build_year': spec.build_year,
        'lpp_m': spec.lpp_m,
        'breadth_m': spec.breadth_m,
        'design_draft_m': spec.design_draft_m,
        'dwt': spec.dwt,
        'gross_tonnage': spec.gross_tonnage,
        'mcr_kw': spec.mcr_kw,
        'ncr_kw': spec.ncr_kw,
        'design_speed_kn': spec.design_speed_kn,
        'propeller_type': spec.propeller_type,
        'diameter_m': spec.propeller_diameter_m,
        'pitch_m': spec.propeller_pitch_m,
        'n_blades': spec.n_blades,
        'transverse_area_m2': spec.transverse_area_m2,
        'ref_curve_id': spec.ref_curve_id,
        'last_dry_dock_date': None,
    }


def build_reference_curve(spec: VesselSpec) -> list[dict]:
    """The vessel's sea-trial ``reference_curve`` rows (§2.5)."""
    return curve_points(spec)


def build_fuel_price(rng: np.random.Generator, dates: list[dt.date]) -> list[dict]:
    """A daily ``fuel_price`` random-walk series for each fuel type (§2.6)."""
    rows: list[dict] = []
    for fuel in FUEL_TYPES:
        price = _FUEL_BASE_PRICE[fuel]
        vol = _FUEL_VOL[fuel]
        steps = rng.normal(0.0, vol, len(dates))
        for i, d in enumerate(dates):
            price = max(150.0, price + steps[i])
            rows.append(
                {
                    'date': d,
                    'fuel_type': fuel,
                    'price_usd_per_mt': float(price),
                }
            )
    return rows
