"""ISO 19030 data filtering (pipeline S4) — the ``valid_flag`` predicate.

Keep only steady, deep-water, moderate-weather at-sea points where the reference
speed-power curve applies. Deep-water and rudder-angle filters from ISO 19030 are
N/A for the POC (raw Noon Reports carry no water depth or rudder angle);
statistical-outlier rejection is deferred to M3. What remains: at-sea steaming,
speed above a curve-applicable floor, Beaufort ≤ 6, displacement within the
curve's fitted band, and finite propulsion fields.
"""

from __future__ import annotations

import math

from ym_datalake.synthetic_data.fleet import VesselSpec

_MAX_BEAUFORT = 6
_MIN_SPEED_FRACTION = 0.5  # curve is fitted from 0.5·V_design upward
_DISP_LO_FRACTION = 0.5  # displacement band around Δ_ref where the curve holds
_DISP_HI_FRACTION = 1.2

_FINITE_FIELDS = ('speed_tw_kn', 'me_shaft_power_kw', 'displacement_mt', 'me_foc_mt')


def _finite(value) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value)


def is_valid(noon: dict, spec: VesselSpec) -> bool:
    """True iff the record is a steady point the ISO 19030 metrics may use."""
    if noon['voyage_phase'] != 'at_sea' or noon['steaming_hours'] <= 0:
        return False
    if any(not _finite(noon.get(f)) for f in _FINITE_FIELDS):
        return False
    if noon['me_shaft_power_kw'] <= 0 or noon['speed_tw_kn'] < _MIN_SPEED_FRACTION * spec.design_speed_kn:
        return False
    if noon['beaufort'] > _MAX_BEAUFORT:
        return False
    delta_ref = spec.design_displacement_mt
    return _DISP_LO_FRACTION * delta_ref <= noon['displacement_mt'] <= _DISP_HI_FRACTION * delta_ref
