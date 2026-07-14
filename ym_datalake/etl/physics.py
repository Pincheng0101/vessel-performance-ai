"""Physics, re-derived from the standards (ISO 15016 / ISO 19030 / MEPC.353-354).

Scalar float math, stdlib only. Units are SI unless the name says otherwise; knots
and tonnes appear where they match the source schema.

Two things about the *real* dataset shape the formulas here:

* **Directions are 16-point compass indices (0-15), not degrees.** ``wind_direction``
  = 7 means 7 x 22.5 deg = 157.5 deg. Everything in the source that says "direction"
  needs :func:`compass_to_deg` first.
* **There is no heading column.** The wind correction therefore depends on whether
  ``WIND_DIRECTION`` is a *true compass* bearing (needs a heading to make it
  bow-relative) or is *already bow-relative*. The dataset README calls the units
  "相對/羅經" (relative/compass) — genuinely ambiguous. ``curated.corrections``
  resolves it empirically rather than guessing; both conventions are supported here.
"""

from __future__ import annotations

import math

RHO_SW_KG_M3 = 1025.0  # seawater, ITTC standard
RHO_AIR_KG_M3 = 1.225  # air at 15 C
GRAVITY_M_S2 = 9.81
KN_TO_MS = 0.514444

# Quasi-propulsive coefficient: shaft power -> effective towing power. 0.70 is the
# usual design figure for a single-screw container ship with an FPP.
PROPULSIVE_EFFICIENCY = 0.70

# Blendermann longitudinal wind-drag coefficient for a laden container ship, head-on
# (Blendermann 1994, "Parameter identification of wind loads on ships"). The angular
# shape is the leading cosine term: head wind resists, following wind thrusts.
C_AA_HEAD = 0.85

# STAWAVE-1 (ISO 15016 Annex) is only defined for head seas. Full effect within
# +/-45 deg of the bow, tapering to zero abeam; following seas add nothing.
_STAWAVE_FULL_DEG = 45.0
_STAWAVE_ZERO_DEG = 90.0

COMPASS_POINTS = 16
DEG_PER_POINT = 360.0 / COMPASS_POINTS  # 22.5


def compass_to_deg(point: float | None) -> float | None:
    """16-point compass index (0-15) -> degrees (0-360)."""
    return None if point is None else (float(point) * DEG_PER_POINT) % 360.0


def relative_angle_deg(direction_deg: float, heading_deg: float) -> float:
    """Direction relative to the bow, folded to 0-180 (0 = dead ahead, 180 = astern)."""
    return abs((direction_deg - heading_deg + 180.0) % 360.0 - 180.0)


def apparent_wind(true_wind_kn: float, wind_angle_deg: float, stw_kn: float) -> tuple[float, float]:
    """Apparent wind seen by the moving ship: (speed m/s, angle off the bow in deg).

    ``wind_angle_deg`` is the *bow-relative* angle the true wind blows FROM (0 = dead
    ahead). The ship's own motion adds a head-wind component of ``stw_kn``.
    """
    theta = math.radians(wind_angle_deg)
    # Components in the ship frame: x forward, y to starboard. A head wind (0 deg)
    # opposes the bow, and the ship's motion adds stw to the head-on component.
    head = true_wind_kn * math.cos(theta) + stw_kn
    cross = true_wind_kn * math.sin(theta)
    speed_kn = math.hypot(head, cross)
    angle = math.degrees(math.atan2(abs(cross), head))
    return (speed_kn * KN_TO_MS, angle)


def wind_resistance_n(transverse_area_m2: float, apparent_speed_ms: float, apparent_angle_deg: float) -> float:
    """Blendermann added resistance in wind (N). Negative = following wind thrusts."""
    c_aa = C_AA_HEAD * math.cos(math.radians(apparent_angle_deg))
    return 0.5 * RHO_AIR_KG_M3 * c_aa * transverse_area_m2 * apparent_speed_ms**2


def wave_resistance_n(wave_height_m: float, breadth_m: float, lpp_m: float, wave_angle_deg: float) -> float:
    """STAWAVE-1 added resistance in waves (N).

    ``R_AWL = (1/16) . rho . g . Hs^2 . B . sqrt(B / L_BWL)`` (ISO 15016 Annex), applied
    with a head-sea taper: full within 45 deg of the bow, zero at 90 deg and beyond.
    """
    if wave_height_m <= 0.0:
        return 0.0
    if wave_angle_deg >= _STAWAVE_ZERO_DEG:
        return 0.0
    taper = 1.0
    if wave_angle_deg > _STAWAVE_FULL_DEG:
        taper = (_STAWAVE_ZERO_DEG - wave_angle_deg) / (_STAWAVE_ZERO_DEG - _STAWAVE_FULL_DEG)
    r_awl = (1.0 / 16.0) * RHO_SW_KG_M3 * GRAVITY_M_S2 * wave_height_m**2 * breadth_m * math.sqrt(breadth_m / lpp_m)
    return r_awl * taper


def resistance_to_power_kw(resistance_n: float, speed_kn: float, eta: float = PROPULSIVE_EFFICIENCY) -> float:
    """Shaft power (kW) needed to overcome a towing resistance (N) at ``speed_kn``."""
    return resistance_n * (speed_kn * KN_TO_MS) / eta / 1000.0


def theoretical_speed_kn(pitch_m: float, rpm: float) -> float:
    """Advance speed with no slip: ``V_th = pitch . rpm . 60 / 1852`` (kn)."""
    return pitch_m * rpm * 60.0 / 1852.0


def slip_fraction(speed_kn: float, pitch_m: float, rpm: float) -> float | None:
    """Propeller slip ``(V_th - V) / V_th``; apparent uses SOG, real uses STW."""
    v_th = theoretical_speed_kn(pitch_m, rpm)
    if v_th <= 0.0:
        return None
    return (v_th - speed_kn) / v_th


def sfoc_g_kwh(foc_mt: float, power_kw: float, hours: float) -> float | None:
    """Specific fuel oil consumption (g/kWh) = ``FOC . 1e6 / (P . h)``."""
    denom = power_kw * hours
    if denom <= 0.0:
        return None
    return foc_mt * 1.0e6 / denom


def foc_mt(power_kw: float, sfoc: float, hours: float) -> float:
    """Fuel oil consumption (t) = ``P . SFOC . h / 1e6`` (g -> t)."""
    return power_kw * sfoc * hours / 1.0e6


def admiralty_coef(displacement_t: float, stw_kn: float, power_kw: float) -> float | None:
    """``delta^(2/3) . V^3 / P`` — falls as the hull degrades."""
    if power_kw <= 0.0 or displacement_t <= 0.0:
        return None
    return displacement_t ** (2.0 / 3.0) * stw_kn**3 / power_kw


def eeoi(co2_mt: float, cargo_t: float, distance_nm: float) -> float | None:
    """Energy Efficiency Operational Indicator (gCO2 / t.nm); None on a ballast day."""
    denom = cargo_t * distance_nm
    if denom <= 0.0:
        return None
    return co2_mt * 1.0e6 / denom


def excess_foc_mt(me_foc_mt: float, speed_loss_pct: float, curve_n: float) -> float:
    """Fuel wasted to fouling: ``FOC . [1 - (1-s)^n]``, s = speed_loss/100. 0 if s <= 0.

    At the same power a fouled hull makes ``(1-s)`` of the clean speed, so covering the
    same distance costs ``1/(1-s)^n`` of the clean fuel; the excess is what is left when
    the clean burn is taken out.
    """
    s = speed_loss_pct / 100.0
    if s <= 0.0 or s >= 1.0:
        return 0.0
    return me_foc_mt * (1.0 - (1.0 - s) ** curve_n)


def deep_water_min_m(breadth_m: float, draft_m: float, stw_kn: float) -> float:
    """ISO 19030 deep-water floor: ``h > 3.sqrt(B.T)`` and ``h > 2.75.V^2/g``.

    Shallow water inflates resistance and would masquerade as hull fouling, so a day
    over a shoal must not enter a speed-loss fit. The real dataset carries
    ``water_depth`` (100 % fill), so unlike the synthetic lake this filter is live.
    """
    v_ms = stw_kn * KN_TO_MS
    return max(3.0 * math.sqrt(breadth_m * draft_m), 2.75 * v_ms**2 / GRAVITY_M_S2)
