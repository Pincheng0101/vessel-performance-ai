"""``fact_voyage`` — one row per (ship, voyage), rolled up from the daily facts.

A ``VOYAGE`` in this dataset is a **rotation**, not a port-to-port leg: median 71 days
and ~19,157 nm (the longest runs 84,150 nm). ``geography`` fits each one with a
multi-leg port rotation; ``from_port`` / ``to_port`` are that rotation's endpoints.

**The energy balance is exact by construction.** ``distance_nm``, ``total_foc_mt`` and
``co2_mt`` are plain sums of the *real* daily values — they are never re-derived from
speed or power. So ``sum(fact_voyage.total_foc_mt)`` equals ``sum(noon_report.total_consump)``
to the last decimal, and any drift is a bug, not a rounding choice. Only the USD columns
and the schedule are synthesized.

**The schedule is measured, not assumed.** There is no plan in this dataset, so
``planned_days`` has to be inferred — but it is inferred from the *real* distance at the
class's own *real* typical pace (:func:`planned_speed_kn`: the median realised voyage speed,
9.79 kn for W1 and 10.33 kn for W2). The earlier definition ran the synthesized rotation
polyline at 0.85 x design speed — a pace this fleet is ~1.9x off, so every one of the 300
voyages was late and ``on_time_flag`` carried no information. Read the flag as "did this
voyage keep pace with its class's typical rotation", which is the only schedule the data has.
"""

from __future__ import annotations

import statistics
from collections import defaultdict


def planned_speed_kn(voyage_rows: list[dict]) -> dict[str, float]:
    """hull_class -> the median realised voyage speed (kn), out of real distance and real days.

    Every input is measured: ``distance_nm`` is the sum of the daily ``TOTAL_DISTANCE``, and
    the elapsed days are the first and last noon report of the voyage. The median (not the
    mean) so a single becalmed or short-reporting rotation does not set the class's pace.
    """
    speeds: dict[str, list[float]] = defaultdict(list)
    for row in voyage_rows:
        elapsed_days = row['arrive_day'] - row['depart_day'] + 1
        if row['distance_nm'] > 0.0 and elapsed_days > 0:
            speeds[row['hull_class']].append(row['distance_nm'] / (elapsed_days * 24.0))
    return {hull_class: statistics.median(values) for hull_class, values in speeds.items()}


def build(
    daily_rows: list[dict],
    vessels: dict[str, dict],
    voyage_geo: dict[tuple[str, str], dict],
    prices: dict[tuple[int, str], float],
) -> list[dict]:
    """Roll the daily spine up to the voyage grain."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in daily_rows:
        if row.get('voyage') is not None:
            groups[(row['ship_id'], row['voyage'])].append(row)

    out: list[dict] = []
    for (ship_id, voyage), rows in sorted(groups.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        vessel = vessels[ship_id]
        geo = voyage_geo.get((ship_id, voyage), {})

        # Sums of the REAL daily values. This is what makes the energy balance exact.
        distance_nm = sum(r.get('total_distance') or 0.0 for r in rows)
        total_foc = sum(r.get('total_foc_mt') or 0.0 for r in rows)
        co2 = sum(r.get('co2_mt') or 0.0 for r in rows)
        hours = sum(r.get('hours_total') or 0.0 for r in rows)

        fuel_cost = 0.0
        for row in rows:
            price = prices.get((row['noon_utc'], row.get('fuel_type')))
            if price and row.get('total_foc_mt'):
                fuel_cost += row['total_foc_mt'] * price

        losses = [r['speed_loss_pct'] for r in rows if r['valid_flag'] and r.get('speed_loss_pct') is not None]
        depart, arrive = rows[0]['noon_utc'], rows[-1]['noon_utc']

        out.append(
            {
                'ship_id': ship_id,
                'voyage_no': voyage,
                'hull_class': vessel['hull_class'],
                'from_port': geo.get('from_port'),
                'to_port': geo.get('to_port'),
                'depart_day': depart,
                'arrive_day': arrive,
                'depart_date': rows[0]['report_date'],
                'arrive_date': rows[-1]['report_date'],
                'distance_nm': distance_nm,
                'sea_days': len(rows),
                'avg_speed_kn': distance_nm / hours if hours > 0 else None,
                'total_foc_mt': total_foc,
                'fuel_cost_usd': fuel_cost,
                'co2_mt': co2,
                'avg_speed_loss_pct': sum(losses) / len(losses) if losses else None,
                'usd_per_nm': fuel_cost / distance_nm if distance_nm > 0 else None,
                # Filled below, once every voyage of the class has been rolled up: the schedule
                # is the class's own median pace, so it cannot be known one voyage at a time.
                'on_time_flag': None,
                'planned_days': None,
            }
        )

    pace = planned_speed_kn(out)
    for record in out:
        speed_kn = pace.get(record['hull_class'])
        if not speed_kn or record['distance_nm'] <= 0.0:
            continue
        planned_days = max(1, round(record['distance_nm'] / (speed_kn * 24.0)))
        actual_days = record['arrive_day'] - record['depart_day'] + 1
        record['planned_days'] = planned_days
        record['on_time_flag'] = actual_days <= planned_days
    return out
