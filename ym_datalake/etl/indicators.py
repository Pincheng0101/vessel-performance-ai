"""Derived performance indicators (pipeline S5/S6).

ISO 19030 percentage speed loss plus the other per-day metrics from spec §4.4:
slip, SFOC, Admiralty coefficient, EEOI, CO2, excess FOC and excess cost. All
reuse ``physics``/``curves`` so the numbers stay consistent with the generator.
"""

from __future__ import annotations

from ym_datalake.synthetic_data import physics
from ym_datalake.synthetic_data.curves import ReferenceCurve

# Phase 4 weather-attribution: the off-design engine-load SFOC penalty mirrors the
# generator's load U-shape ``sfoc_base·(1 + _SFOC_LOAD_COEF·(load − _LOAD_OPTIMUM)²)``
# (``synthetic_data.generate._sfoc``), so the operational channel is the exact inverse
# of the generator's operational term — no design-SFOC reference is needed.
_SFOC_LOAD_COEF = 0.18
_LOAD_OPTIMUM = 0.80


def co2_mt(noon: dict) -> float:
    """Daily CO2 (t) from the day's fuel type and total FOC (§4.4 / C8)."""
    return physics.co2_mt({noon['fuel_type']: noon['total_foc_mt']})


def speed_loss(curve: ReferenceCurve, power_corrected_kw: float, displacement_mt: float, stw_kn: float) -> tuple:
    """Return (v_expected_kn, speed_loss_pct).

    ``v_expected`` is the clean-hull speed the reference curve predicts at the
    corrected power (``f_refcurve``); positive speed loss = degradation (§4.5).
    """
    v_expected = curve.clean_speed_kn(power_corrected_kw, displacement_mt)
    speed_loss_pct = (v_expected - stw_kn) / v_expected * 100.0
    return v_expected, speed_loss_pct


def slips(noon: dict) -> tuple:
    """Return (slip_apparent, slip_real): apparent uses SOG, real uses STW (§4.4)."""
    pitch, rpm = noon['propeller_pitch_m'], noon['me_rpm']
    return (
        physics.slip_fraction(noon['speed_og_kn'], pitch, rpm),
        physics.slip_fraction(noon['speed_tw_kn'], pitch, rpm),
    )


def sfoc_g_kwh(noon: dict) -> float:
    """Specific fuel oil consumption (g/kWh) = me_foc·1e6 / (power·hours) (§4.4)."""
    return noon['me_foc_mt'] * 1.0e6 / (noon['me_shaft_power_kw'] * noon['steaming_hours'])


def admiralty_coef(noon: dict) -> float:
    """Admiralty coefficient ``Δ^(2/3)·V³ / P_S`` — falls as the hull degrades."""
    return noon['displacement_mt'] ** (2.0 / 3.0) * noon['speed_tw_kn'] ** 3 / noon['me_shaft_power_kw']


def eeoi(co2: float, noon: dict) -> float | None:
    """Energy Efficiency Operational Indicator (gCO2 / tonne·nm); None if idle."""
    denom = noon['cargo_weight_mt'] * noon['distance_og_nm']
    if denom <= 0:
        return None
    return co2 * 1.0e6 / denom


def excess_foc_mt(noon: dict, speed_loss_pct: float, curve_n: float) -> float:
    """Extra fuel from fouling: ``FOC·[1 − (1−s)^n]`` (spec §4.4). 0 if s ≤ 0."""
    s = speed_loss_pct / 100.0
    if s <= 0.0:
        return 0.0
    return noon['me_foc_mt'] * (1.0 - (1.0 - s) ** curve_n)


def excess_cost_usd(excess_foc: float, price_usd_per_mt: float | None) -> float | None:
    """Excess fuel cost (USD) = excess FOC × the day's fuel price; None if unpriced."""
    if price_usd_per_mt is None:
        return None
    return excess_foc * price_usd_per_mt


def excess_cost_attribution(
    noon: dict, corr: dict, excess_cost: float | None, sfoc: float, price: float | None, mcr_kw: float
) -> dict:
    """Split the day's fuel penalty into fouling / weather / operational (all USD, §Phase 4).

    Additive channels (not a partition): ``fouling`` is the existing ISO 19030 speed-loss
    penalty (``excess_cost`` = ``excess_cost_usd``); ``weather`` is the fuel cost of the
    wind+wave added-resistance power the ISO 15016 correction removed (``dp_env_kw``,
    recomputed from ``corr`` so ``corrections`` stays untouched); ``operational`` is the
    off-design engine-load SFOC penalty (mirrors the generator ``_sfoc`` load U-shape).
    All three ``None`` on unpriced / non-at-sea rows (co-null with ``excess_cost``).
    """
    if price is None or excess_cost is None:
        return {
            'excess_cost_fouling_usd': None,
            'excess_cost_weather_usd': None,
            'excess_cost_operational_usd': None,
        }
    r_env_n = (corr['resistance_wind_kn'] + corr['resistance_wave_kn']) * 1000.0
    dp_env_kw = physics.resistance_to_power_kw(r_env_n, corr['speed_corrected_kn'])
    weather_foc = physics.foc_mt(dp_env_kw, sfoc, noon['steaming_hours'])
    load = min(1.05, noon['me_shaft_power_kw'] / mcr_kw)
    penalty = _SFOC_LOAD_COEF * (load - _LOAD_OPTIMUM) ** 2
    operational_foc = noon['me_foc_mt'] * penalty / (1.0 + penalty)
    return {
        'excess_cost_fouling_usd': excess_cost,
        'excess_cost_weather_usd': max(0.0, weather_foc) * price,
        'excess_cost_operational_usd': max(0.0, operational_foc) * price,
    }
