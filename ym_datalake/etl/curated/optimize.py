"""``fact_speed_profile`` — the slow-steaming economics: where the cheapest speed sits.

For each ship, sweep the reference curve across 24 speed points, inflate the clean power
by the hull's **latest measured** fouling (``P_fouled = P_clean / (1-s)^n``), price the
burn at the latest bunker price, and add the day rate.

**The day rate is what makes the problem interesting.** Fuel cost per mile rises
monotonically with speed, so on fuel alone the optimum is "go as slow as possible". It is
the per-day charter cost — you pay for the ship whether it moves or not — that bends the
total ``usd_per_nm`` into a convex curve with an **interior** minimum. Drop
``charter_usd_per_day`` and the recommended speed degenerates to the slowest grid point.

``charter_usd_per_day`` is ESTIMATED and is the only non-physics input here.
"""

from __future__ import annotations

from ym_datalake.etl import fuel, physics
from ym_datalake.etl.raw.reference_curve import Curve

# ESTIMATED (USD/day): the time cost of a 14,000 TEU ship. Not a measured particular, and
# deliberately not carried on dim_vessel — it is a market rate, not a hull property.
CHARTER_USD_PER_DAY = 45_000.0

GRID_POINTS = 24
SPEED_RANGE_FRACTION = (0.5, 1.0)
# A fallback SFOC for the grid sweep when a ship's own valid rows carry none.
DEFAULT_SFOC_G_KWH = 175.0


def build(
    daily_rows: list[dict],
    vessels: dict[str, dict],
    curves: dict[str, Curve],
    prices: dict[tuple[int, str], float],
) -> list[dict]:
    """24 speed-grid rows per ship, with its economical speed marked on every one."""
    by_ship: dict[str, list[dict]] = {}
    for row in daily_rows:
        by_ship.setdefault(row['ship_id'], []).append(row)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        vessel = vessels[ship_id]
        curve = curves[ship_id]

        valid = [r for r in rows if r['valid_flag']]
        latest = valid[-1] if valid else None
        speed_loss = (latest or {}).get('speed_loss_pct') or 0.0
        s = min(max(speed_loss / 100.0, 0.0), 0.5)  # a hull cannot lose more than half its speed

        sfoc = next(
            (r['sfoc_g_kwh'] for r in reversed(valid) if r.get('sfoc_g_kwh')),
            DEFAULT_SFOC_G_KWH,
        )
        fuel_type = next((r['fuel_type'] for r in reversed(rows) if r.get('fuel_type')), 'VLSFO')
        last_day = rows[-1]['noon_utc']
        price = prices.get((last_day, fuel_type)) or 0.0

        # Annualise the real distance sailed over the real span of the record.
        span_days = max(1, rows[-1]['noon_utc'] - rows[0]['noon_utc'] + 1)
        total_distance = sum(r.get('total_distance') or 0.0 for r in rows)
        annual_distance = total_distance * 365.0 / span_days

        displacement_ref = curve.displacement_ref_t
        lo, hi = SPEED_RANGE_FRACTION
        v_lo, v_hi = lo * vessel['design_speed_kn'], hi * vessel['design_speed_kn']
        step = (v_hi - v_lo) / (GRID_POINTS - 1)

        grid: list[dict] = []
        for i in range(GRID_POINTS):
            speed = v_lo + step * i
            clean_power = curve.clean_power_kw(speed, displacement_ref)
            fouled_power = clean_power / (1.0 - s) ** curve.n
            foc_per_day = physics.foc_mt(fouled_power, sfoc, 24.0)
            fuel_usd = foc_per_day * price
            total_usd = fuel_usd + CHARTER_USD_PER_DAY
            miles_per_day = speed * 24.0
            grid.append(
                {
                    'ship_id': ship_id,
                    'speed_kn': speed,
                    'shaft_power_kw': clean_power,
                    'foc_mt_per_day': foc_per_day,
                    'co2_mt_per_day': foc_per_day * fuel.CARBON_FACTOR[fuel_type],
                    'fuel_usd_per_day': fuel_usd,
                    'charter_usd_per_day': CHARTER_USD_PER_DAY,
                    'usd_per_day': total_usd,
                    'usd_per_nm': total_usd / miles_per_day,
                    'fuel_usd_per_nm': fuel_usd / miles_per_day,
                    'recommended_speed_kn': None,
                    'current_speed_kn': (latest or {}).get('speed_through_water'),
                    'annual_distance_nm': annual_distance,
                }
            )

        economical = min(grid, key=lambda g: g['usd_per_nm'])['speed_kn']
        for point in grid:
            point['recommended_speed_kn'] = economical
        out.extend(grid)
    return out
