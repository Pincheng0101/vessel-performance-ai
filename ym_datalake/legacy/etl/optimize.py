"""Bunker & slow-steaming optimizer fact (curated zone, Phase 2).

Grain of ``fact_speed_profile`` is ``(imo_number, speed_kn)`` — one row per
speed-grid point per vessel. For each vessel the reference speed-power curve
(``curves.build_curve``) is swept from 0.5→1.0 of design speed at the reference
displacement, the clean power is inflated by the latest fouling (speed-loss)
state, and the fouled fuel burn is priced with the latest bunker price and added
to the vessel's per-day charter (hire) cost. The resulting ``usd_per_nm`` curve
is **convex** — fuel `usd_per_nm ∝ V^(n-1)` alone is strictly increasing, so the
per-day time cost (charter) is what puts an interior *economical speed* minimum
on the grid (C19).

Deterministic: no RNG and no ground truth — purely the reference curve plus the
latest valid daily / noon / fuel-price values. Additive to the M2/M3 tables, so
C1–C18 are untouched.
"""

from __future__ import annotations

import datetime as dt

from ym_datalake.synthetic_data import physics
from ym_datalake.synthetic_data.curves import build_curve
from ym_datalake.synthetic_data.fleet import get_vessel

# 24 speed-grid fractions of design speed, 0.5→1.0 (endpoints inclusive).
_SPEED_GRID = tuple(0.5 + 0.5 * i / 23 for i in range(24))
_DAYS_PER_YEAR = 365.25


def _date(value) -> str:
    return str(value)[:10]


def _latest_valid(rows: list[dict], key: str) -> float | None:
    """Most recent valid daily value for ``key`` (mirrors recommendation._latest_valid_speed_loss)."""
    valid = [r for r in rows if r.get('valid_flag') and r.get(key) is not None]
    return max(valid, key=lambda r: r['report_date'])[key] if valid else None


def _latest_fuel_type(noon_rows: list[dict]) -> str:
    """Fuel type burned on the most recent noon report."""
    return max(noon_rows, key=lambda n: n['report_datetime_utc'])['fuel_type']


def _latest_price(fuel_price: list[dict], fuel_type: str) -> float | None:
    """Most recent priced value for ``fuel_type`` in the fuel_price series."""
    priced = [p for p in fuel_price if p['fuel_type'] == fuel_type]
    return max(priced, key=lambda p: _date(p['date']))['price_usd_per_mt'] if priced else None


def _annual_distance_nm(noon_rows: list[dict]) -> float:
    """Σ daily distance annualised over the noon-report date span."""
    total = sum(n['distance_og_nm'] for n in noon_rows)
    dates = [_date(n['report_datetime_utc']) for n in noon_rows]
    span_days = (dt.date.fromisoformat(max(dates)) - dt.date.fromisoformat(min(dates))).days
    return total / (max(span_days, 1) / _DAYS_PER_YEAR)


def build_speed_profiles(daily: list[dict], noon: list[dict], fuel_price: list[dict]) -> list[dict]:
    """One ``fact_speed_profile`` row per ``(imo, speed-grid point)``.

    ``daily`` is ``fact_performance_daily`` (supplies the latest fouling / SFOC /
    STW state), ``noon`` the raw Noon Report (latest fuel type + annual distance),
    ``fuel_price`` the raw price series. Each vessel's grid is priced into a convex
    ``usd_per_nm`` curve and its argmin tagged as ``recommended_speed_kn``.
    """
    daily_by_imo: dict[str, list[dict]] = {}
    for d in daily:
        daily_by_imo.setdefault(d['imo_number'], []).append(d)
    noon_by_imo: dict[str, list[dict]] = {}
    for n in noon:
        noon_by_imo.setdefault(n['imo_number'], []).append(n)

    rows: list[dict] = []
    for imo, vessel_daily in daily_by_imo.items():
        noon_rows = noon_by_imo.get(imo)
        if not noon_rows:
            continue
        spec = get_vessel(imo)
        curve = build_curve(spec)
        n = spec.curve_n
        delta = spec.design_displacement_mt
        charter = spec.charter_usd_per_day

        # Latest state: fouling (speed loss), engine efficiency (SFOC), and bunker price.
        s = (_latest_valid(vessel_daily, 'speed_loss_pct') or 0.0) / 100.0
        sfoc = _latest_valid(vessel_daily, 'sfoc_g_kwh')
        fuel_type = _latest_fuel_type(noon_rows)
        price = _latest_price(fuel_price, fuel_type)
        if sfoc is None or price is None:
            continue

        fouling = (1.0 - s) ** n  # power-inflation denominator (analog of indicators.excess_foc_mt)
        current_speed = _latest_valid(vessel_daily, 'speed_corrected_kn')
        annual_distance = _annual_distance_nm(noon_rows)

        vessel_rows: list[dict] = []
        for frac in _SPEED_GRID:
            v = frac * spec.design_speed_kn
            p_clean = curve.clean_power_kw(v, delta)  # clean-hull power at Δ_ref
            p_fouled = p_clean / fouling
            foc = physics.foc_mt(p_fouled, sfoc, 24.0)
            fuel_usd_per_day = foc * price
            usd_per_day = fuel_usd_per_day + charter
            vessel_rows.append(
                {
                    'imo_number': imo,
                    'speed_kn': v,
                    'shaft_power_kw': p_clean,
                    'foc_mt_per_day': foc,
                    'co2_mt_per_day': physics.co2_mt({fuel_type: foc}),
                    'fuel_usd_per_day': fuel_usd_per_day,
                    'charter_usd_per_day': charter,
                    'usd_per_day': usd_per_day,
                    'usd_per_nm': usd_per_day / (v * 24.0),
                    'fuel_usd_per_nm': fuel_usd_per_day / (v * 24.0),
                }
            )

        recommended = min(vessel_rows, key=lambda r: r['usd_per_nm'])['speed_kn']
        for r in vessel_rows:
            r['vessel_name'] = spec.vessel_name
            r['recommended_speed_kn'] = recommended
            r['current_speed_kn'] = current_speed
            r['annual_distance_nm'] = annual_distance
        rows.extend(vessel_rows)
    return rows
