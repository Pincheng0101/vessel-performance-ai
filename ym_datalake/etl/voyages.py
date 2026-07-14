"""Voyage fact + port dimension (curated zone).

Grain of ``fact_voyage`` is ``(imo_number, voyage_no)`` — one rotation leg incl.
its in-port day. The Noon Report is grouped by ``(imo, voyage_no)`` and rolled up:
distance / FOC / CO2 sum the raw daily values (so C18's per-vessel energy balance
is exact), fuel cost prices each day at its own ``(date, fuel_type)``, and the
planned ETA / on-time flag derive from the great-circle path length at 0.85×
design speed. ``dim_port`` is the 10-row static port table from ``ports.PORTS``
(also mirrored in ``web/ports.js`` for the Fleet Map).
"""

from __future__ import annotations

import datetime as dt

from ym_datalake.synthetic_data import ports
from ym_datalake.synthetic_data.fleet import get_vessel

# Planned voyages run the design speed derated to a realistic service margin, so
# roughly half the voyages land on-time (arrive ≤ planned duration).
_SERVICE_SPEED_FRAC = 0.85


def build_dim_port() -> list[dict]:
    """Port dimension rows (locode, name, lat, lon, is_eu) from ``ports.PORTS``."""
    return [
        {'locode': locode, 'name': p['name'], 'lat': p['lat'], 'lon': p['lon'], 'is_eu': p['is_eu']}
        for locode, p in ports.PORTS.items()
    ]


def _date(value) -> str:
    return str(value)[:10]


def build_voyages(noon: list[dict], daily: list[dict], prices: dict) -> list[dict]:
    """One ``fact_voyage`` row per ``(imo, voyage_no)``.

    ``prices`` is ``{(date, fuel_type): usd_per_mt}`` (from ``compute._price_index``);
    ``daily`` supplies each day's ISO ``speed_loss_pct`` and reconciled ``co2_mt``.
    """
    daily_idx = {(d['imo_number'], _date(d['report_date'])): d for d in daily}

    groups: dict[tuple[str, str], list[dict]] = {}
    for n in noon:
        groups.setdefault((n['imo_number'], n['voyage_no']), []).append(n)

    rows: list[dict] = []
    for (imo, voyage_no), recs in groups.items():
        recs = sorted(recs, key=lambda r: r['report_datetime_utc'])
        spec = get_vessel(imo)
        at_sea = [r for r in recs if r['voyage_phase'] == 'at_sea']
        from_port = recs[0]['port_from']
        to_port = recs[0]['port_to']
        depart_date = _date(recs[0]['report_datetime_utc'])
        arrive_date = _date(recs[-1]['report_datetime_utc'])

        distance_nm = sum(r['distance_og_nm'] for r in recs)
        steaming_hours = sum(r['steaming_hours'] for r in at_sea)
        total_foc_mt = sum(r['total_foc_mt'] for r in recs)  # all rows → C18-exact
        fuel_cost_usd = sum(
            r['total_foc_mt'] * prices.get((_date(r['report_datetime_utc']), r['fuel_type']), 0.0) for r in recs
        )

        co2_mt = 0.0
        speed_losses: list[float] = []
        for r in recs:
            d = daily_idx.get((imo, _date(r['report_datetime_utc'])))
            if d is None:
                continue
            if d.get('co2_mt') is not None:
                co2_mt += d['co2_mt']
            if r['voyage_phase'] == 'at_sea' and d.get('speed_loss_pct') is not None:
                speed_losses.append(d['speed_loss_pct'])

        avg_speed_kn = distance_nm / steaming_hours if steaming_hours > 0 else None
        usd_per_nm = fuel_cost_usd / distance_nm if distance_nm > 0 else None
        avg_speed_loss_pct = sum(speed_losses) / len(speed_losses) if speed_losses else None

        # Planned duration from the bent great-circle path at the service speed.
        path_nm = ports.path_distance_nm(ports.route_path(from_port, to_port))
        planned_days = round(path_nm / (_SERVICE_SPEED_FRAC * spec.design_speed_kn * 24.0))
        depart = dt.date.fromisoformat(depart_date)
        planned_eta = (depart + dt.timedelta(days=planned_days)).isoformat()
        actual_days = (dt.date.fromisoformat(arrive_date) - depart).days
        on_time_flag = actual_days <= planned_days

        rows.append(
            {
                'imo_number': imo,
                'voyage_no': voyage_no,
                'vessel_name': recs[0]['vessel_name'],
                'from_port': from_port,
                'to_port': to_port,
                'depart_date': depart_date,
                'arrive_date': arrive_date,
                'distance_nm': distance_nm,
                'sea_days': len(at_sea),
                'avg_speed_kn': avg_speed_kn,
                'total_foc_mt': total_foc_mt,
                'fuel_cost_usd': fuel_cost_usd,
                'co2_mt': co2_mt,
                'avg_speed_loss_pct': avg_speed_loss_pct,
                'usd_per_nm': usd_per_nm,
                'on_time_flag': on_time_flag,
                'planned_eta': planned_eta,
            }
        )
    return rows
