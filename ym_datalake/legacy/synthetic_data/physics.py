"""Pure forward-physics helpers (C1–C8).

Scalar float math (numpy is the package dependency but these helpers are simple
enough to stay scalar). All units are SI unless a name says otherwise; knots and
tonnes appear where they match the raw schema.
"""

from __future__ import annotations

import math

# Physical constants.
RHO_SW_REF_KG_M3 = 1025.0  # reference seawater density
RHO_AIR_KG_M3 = 1.225
GRAVITY_M_S2 = 9.81
KN_TO_MS = 0.514444  # 1 knot in m/s
PROPULSIVE_EFFICIENCY = 0.68  # quasi-propulsive coefficient for env-power add

# Carbon factors tCO2 / t-fuel (§3.2 C8 / §4.4).
CARBON_FACTORS: dict[str, float] = {
    'HFO': 3.114,
    'VLSFO': 3.151,
    'LSMGO': 3.206,
    'MGO': 3.206,
}

# Lower calorific values MJ/kg by fuel type (raw ``fuel_lcv_mj_kg``).
FUEL_LCV_MJ_KG: dict[str, float] = {
    'HFO': 40.2,
    'VLSFO': 41.0,
    'LSMGO': 42.7,
    'MGO': 42.7,
}


# --- Hydrostatics (C5/C6) -------------------------------------------------


def displacement_from_draft(mean_draft_m: float, cb: float, lpp_m: float, breadth_m: float, rho_kg_m3: float) -> float:
    """Box-approximation displacement (t) from mean draft.

    ``Δ = ρ · Cb · Lpp · B · T`` — the single hydrostatic curve used both to
    invert the mass balance into a draft and (by the validator) to recover Δ.
    """
    return (rho_kg_m3 / 1000.0) * cb * lpp_m * breadth_m * mean_draft_m


def draft_from_displacement(
    displacement_mt: float, cb: float, lpp_m: float, breadth_m: float, rho_kg_m3: float
) -> float:
    """Invert :func:`displacement_from_draft` to a mean draft (m)."""
    return displacement_mt / ((rho_kg_m3 / 1000.0) * cb * lpp_m * breadth_m)


# --- Added resistance (C1 environment term / §4.2) ------------------------


def wind_resistance_n(c_aa: float, a_xv_m2: float, rel_wind_ms: float) -> float:
    """Aerodynamic added resistance (N), Blendermann-style quadratic drag."""
    return 0.5 * RHO_AIR_KG_M3 * c_aa * a_xv_m2 * rel_wind_ms * rel_wind_ms


def wave_resistance_n(hs_m: float, breadth_m: float, lpp_m: float, rho_kg_m3: float) -> float:
    """Added resistance in waves (N) — STAWAVE-1 head-sea approximation.

    ``R_AWL = (1/16)·ρ·g·H_s²·B·√(B/L)``.
    """
    return (1.0 / 16.0) * rho_kg_m3 * GRAVITY_M_S2 * hs_m * hs_m * breadth_m * math.sqrt(breadth_m / lpp_m)


def resistance_to_power_kw(resistance_n: float, speed_kn: float, eta: float = PROPULSIVE_EFFICIENCY) -> float:
    """Convert a towing resistance (N) at ``speed_kn`` to added shaft power (kW)."""
    return resistance_n * (speed_kn * KN_TO_MS) / eta / 1000.0


# --- Energy balance & propulsion (C2/C7/C8) -------------------------------


def foc_mt(power_kw: float, sfoc_g_kwh: float, hours: float) -> float:
    """Fuel oil consumption (t) = ``P·SFOC·h / 1e6`` (g→t)."""
    return power_kw * sfoc_g_kwh * hours / 1.0e6


def theoretical_speed_kn(pitch_m: float, rpm: float) -> float:
    """Advance speed if no slip: ``V_th = pitch·RPM·60 / 1852`` (knots)."""
    return pitch_m * rpm * 60.0 / 1852.0


def rpm_for_slip(stw_kn: float, pitch_m: float, slip: float) -> float:
    """RPM required so that ``slip = (V_th − STW)/V_th`` holds at ``stw_kn``."""
    v_th = stw_kn / (1.0 - slip)
    return v_th * 1852.0 / (pitch_m * 60.0)


def slip_fraction(stw_kn: float, pitch_m: float, rpm: float) -> float:
    """Apparent/real slip from theoretical vs actual speed (C7)."""
    v_th = theoretical_speed_kn(pitch_m, rpm)
    if v_th <= 0.0:
        return 0.0
    return (v_th - stw_kn) / v_th


def co2_mt(foc_by_fuel: dict[str, float]) -> float:
    """Total CO2 (t) = Σ FOC_type · C_F,type (C8)."""
    return sum(foc * CARBON_FACTORS[fuel] for fuel, foc in foc_by_fuel.items())


def current_projection_kn(current_speed_kn: float, current_dir_deg: float, heading_deg: float) -> float:
    """Along-track current component (kn), positive = following current (C4).

    ``current_dir_deg`` is the direction the current flows *toward*; the
    projection onto the ship heading adds to STW to give SOG.
    """
    return current_speed_kn * math.cos(math.radians(current_dir_deg - heading_deg))


def relative_wind_ms(wind_speed_kn: float, wind_dir_deg: float, heading_deg: float, stw_kn: float) -> float:
    """Relative (apparent) wind speed (m/s) seen by the moving ship.

    ``wind_dir_deg`` is the direction the wind blows *toward*. Combines the true
    wind vector with the ship-induced head wind (−STW along heading).
    """
    heading = math.radians(heading_deg)
    wind = math.radians(wind_dir_deg)
    # Ship velocity vector (toward heading) and true wind velocity vector.
    ship_x, ship_y = stw_kn * math.cos(heading), stw_kn * math.sin(heading)
    wind_x, wind_y = wind_speed_kn * math.cos(wind), wind_speed_kn * math.sin(wind)
    # Apparent wind = true wind − ship motion (wind relative to the ship).
    rel_x, rel_y = wind_x - ship_x, wind_y - ship_y
    return math.hypot(rel_x, rel_y) * KN_TO_MS
