"""ISO 15016 environmental correction (pipeline S3).

Remove wind + wave added resistance from the measured shaft power to recover the
power a *clean-water* hull would need at the same speed/displacement. This is the
exact inverse of the environmental term the generator adds in
``synthetic_data.generate._forward_day`` (same ``physics`` helpers, same
Blendermann ``C_AA`` and STAWAVE-1 head-sea factor), so the correction is
self-consistent and the injected speed loss stays recoverable.
"""

from __future__ import annotations

import math

from ym_datalake.synthetic_data import physics
from ym_datalake.synthetic_data.fleet import VesselSpec

# Aerodynamic drag coefficient (Blendermann head-on); matches the generator.
_C_AA = 0.9


def wind_wave_correction(noon: dict, spec: VesselSpec) -> dict:
    """Return ISO 15016 correction terms for one at-sea noon record.

    Keys: ``resistance_wind_kn``, ``resistance_wave_kn`` (added-resistance in kN),
    ``power_corrected_kw`` (measured shaft power minus environmental power) and
    ``speed_corrected_kn`` (STW — the current-free through-water speed compared
    against the reference curve; only power is corrected here).
    """
    stw = noon['speed_tw_kn']
    heading = noon['heading_deg']

    rel_wind = physics.relative_wind_ms(noon['wind_speed_kn'], noon['wind_dir_deg'], heading, stw)
    r_aa = physics.wind_resistance_n(_C_AA, spec.transverse_area_m2, rel_wind)

    head_factor = 0.5 * (1.0 - math.cos(math.radians(noon['wave_dir_deg'] - heading)))
    r_aw = physics.wave_resistance_n(noon['wave_height_m'], spec.breadth_m, spec.lpp_m, physics.RHO_SW_REF_KG_M3)
    r_aw *= head_factor

    dp_env_kw = physics.resistance_to_power_kw(r_aa + r_aw, stw)
    return {
        'resistance_wind_kn': r_aa / 1000.0,
        'resistance_wave_kn': r_aw / 1000.0,
        'power_corrected_kw': noon['me_shaft_power_kw'] - dp_env_kw,
        'speed_corrected_kn': stw,
    }
