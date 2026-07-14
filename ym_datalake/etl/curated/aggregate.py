"""``agg_fleet_daily`` — the fleet rollup, one row per (fleet, day).

Fleet == hull class here: ``FL-W1`` (S1-S8, S21) and ``FL-W2`` (S9-S12, S22, S23). The
dataset's own grouping is the only fleet structure that exists, so inventing an
operational one would be fiction.

Each day also gets a synthetic **``fleet_id = 'ALL'``** rollup row over the whole fleet.
**Always filter ``fleet_id``** — otherwise every query double-counts the rollup against
its sub-fleets.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import epoch
from ym_datalake.etl.curated.daily import FLEET_BY_HULL_CLASS

ROLLUP_FLEET_ID = 'ALL'


def build(daily_rows: list[dict], anomalies: list[dict]) -> list[dict]:
    """One row per (fleet, day), plus the ALL rollup."""
    alerts_by_day: dict[tuple[str, int], int] = defaultdict(int)
    for anomaly in anomalies:
        alerts_by_day[(anomaly['ship_id'], anomaly['noon_utc'])] += 1

    groups: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for row in daily_rows:
        fleet_id = FLEET_BY_HULL_CLASS[row['hull_class']]
        groups[(fleet_id, row['noon_utc'])].append(row)
        groups[(ROLLUP_FLEET_ID, row['noon_utc'])].append(row)

    out: list[dict] = []
    for (fleet_id, day), rows in sorted(groups.items()):
        losses = [r['speed_loss_pct'] for r in rows if r['valid_flag'] and r.get('speed_loss_pct') is not None]
        excess = [r['excess_cost_usd'] for r in rows if r.get('excess_cost_usd') is not None]
        # The IMO rating, not the AER one: only ``cii_rating_imo`` grades against the year's
        # reduced ``required`` line, so it is the regulatory grade. The AER rating is against the
        # un-reduced 2019 base line and pins the whole fleet into A/B.
        ratings = defaultdict(int)
        for row in rows:
            if row.get('cii_rating_imo'):
                ratings[row['cii_rating_imo']] += 1

        out.append(
            {
                'fleet_id': fleet_id,
                'noon_utc': day,
                **epoch.calendar(day),
                'n_vessels': len({r['ship_id'] for r in rows}),
                'avg_speed_loss_pct': sum(losses) / len(losses) if losses else None,
                'total_excess_cost_usd': sum(excess) if excess else None,
                'cii_count_a': ratings['A'],
                'cii_count_b': ratings['B'],
                'cii_count_c': ratings['C'],
                'cii_count_d': ratings['D'],
                'cii_count_e': ratings['E'],
                'n_alerts': sum(alerts_by_day[(r['ship_id'], day)] for r in rows),
            }
        )
    return out
