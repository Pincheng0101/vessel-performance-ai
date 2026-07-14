"""The dimension tables: ``dim_vessel``, ``dim_reference_curve``, ``dim_port``,
plus ``fact_uwi`` and ``fact_maintenance_event`` — the two curated projections of raw
event tables.

``dim_vessel`` is ``vessel_master`` verbatim plus the curated joins the raw table cannot
carry: the fleet, the reference-curve FK, and the last dry-dock clock. **5 of the 15 ships
(S9-S12, S23) have never dry-docked**, so their ``last_dry_dock_*`` is genuinely null.

``fact_maintenance_event`` keeps all 115 atoms and their ``source_event_type``, so the 77
source rows are still reconstructible from the curated zone. Its ``cost_usd`` /
``downtime_hours`` / ``location`` are ESTIMATED — the source records none of them.
"""

from __future__ import annotations

from ym_datalake.etl import epoch, ports
from ym_datalake.etl.curated.daily import FLEET_BY_HULL_CLASS, FLEET_NAME
from ym_datalake.etl.curated.recommendation import (
    DOWNTIME_USD_PER_HOUR,
    EVENT_COST_USD,
    EVENT_DOWNTIME_HOURS,
)


def build_dim_vessel(vessel_rows: list[dict], events: list[dict]) -> list[dict]:
    """vessel_master + fleet + reference-curve FK + the dry-dock clock."""
    dry_docks: dict[str, int] = {}
    for event in events:
        if event['event_type'] == 'DD':
            ship = event['ship_id']
            dry_docks[ship] = max(dry_docks.get(ship, event['event_day']), event['event_day'])

    out: list[dict] = []
    for vessel in vessel_rows:
        fleet_id = FLEET_BY_HULL_CLASS[vessel['hull_class']]
        last_dd = dry_docks.get(vessel['ship_id'])
        out.append(
            vessel
            | {
                'fleet_id': fleet_id,
                'fleet_name': FLEET_NAME[fleet_id],
                'ref_curve_id': f'RC-{vessel["ship_id"]}',
                'last_dry_dock_day': last_dd,
                'last_dry_dock_date': epoch.to_date_str(last_dd),
            }
        )
    return out


def build_fact_uwi(uwi_rows: list[dict], speed_loss_by_day: dict[tuple[str, int], float]) -> list[dict]:
    """The raw uwi projection + the calendar + the real speed loss measured that day."""
    return [
        row
        | {
            'inspection_date': epoch.to_date_str(row['inspection_day']),
            'speed_loss_pct': speed_loss_by_day.get((row['ship_id'], row['inspection_day'])),
        }
        for row in uwi_rows
    ]


def build_fact_maintenance_event(
    events: list[dict], indicators: list[dict], daily_rows: list[dict], track: dict
) -> list[dict]:
    """The 115 atoms + synthesized economics + the ME recovery / payback columns."""
    # ME indicator rows, keyed to the event they measure.
    recovery = {(i['ship_id'], i['event_day'], i['event_type']): i for i in indicators if i['indicator'] == 'ME'}
    daily_by_key = {(r['ship_id'], r['noon_utc']): r for r in daily_rows}

    out: list[dict] = []
    for event in sorted(events, key=lambda e: (e['ship_id'], e['event_day'], e['event_type'])):
        ship_id, day, event_type = event['ship_id'], event['event_day'], event['event_type']

        position = track.get((ship_id, day))
        location = ports.nearest_port(position['latitude'], position['longitude']) if position else None

        me = recovery.get((ship_id, day, event_type))
        me_recovery_pct = None
        if me and me['reference_value']:
            me_recovery_pct = me['value'] / me['reference_value'] * 100.0

        out.append(
            {
                'ship_id': ship_id,
                'event_id': f'MV-{ship_id}-{day}-{event_type}',
                'event_day': day,
                'event_date': epoch.to_date_str(day),
                'event_type': event_type,
                'source_event_type': event['source_event_type'],
                'propeller_condition': event.get('propeller_condition'),
                'hull_coating_condition': event.get('hull_coating_condition'),
                'hull_fouling_type': event.get('hull_fouling_type'),
                'cavitation_found': event.get('cavitation_found'),
                'draft_fwd_m': event.get('draft_fwd_m'),
                'draft_aft_m': event.get('draft_aft_m'),
                'cost_usd': EVENT_COST_USD[event_type],
                'downtime_hours': EVENT_DOWNTIME_HOURS[event_type],
                'location': location,
                'me_recovery_pct': me_recovery_pct,
                'payback_days': _payback_days(event_type, ship_id, day, daily_by_key),
            }
        )
    return out


_PAYBACK_WINDOW_DAYS = 30


def _payback_days(event_type: str, ship_id: str, day: int, daily_by_key: dict) -> float | None:
    """Event full cost / the daily excess-cost saving it bought. None if it saved nothing.

    ESTIMATED: the numerator is a synthesized cost and the denominator is priced in USD.
    """
    before = [
        daily_by_key[(ship_id, d)].get('excess_cost_usd')
        for d in range(day - _PAYBACK_WINDOW_DAYS, day)
        if (ship_id, d) in daily_by_key
    ]
    after = [
        daily_by_key[(ship_id, d)].get('excess_cost_usd')
        for d in range(day + 1, day + 1 + _PAYBACK_WINDOW_DAYS)
        if (ship_id, d) in daily_by_key
    ]
    before = [v for v in before if v is not None]
    after = [v for v in after if v is not None]
    if not before or not after:
        return None
    saving_per_day = sum(before) / len(before) - sum(after) / len(after)
    if saving_per_day <= 0:
        return None  # the event did not pay for itself; do not invent a payback
    full_cost = EVENT_COST_USD[event_type] + EVENT_DOWNTIME_HOURS[event_type] * DOWNTIME_USD_PER_HOUR
    return full_cost / saving_per_day


def build_dim_port() -> list[dict]:
    return ports.dim_port_rows()
