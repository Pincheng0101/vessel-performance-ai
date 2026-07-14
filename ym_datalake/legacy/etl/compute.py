"""Curated-zone orchestrator: raw ``GenerationResult`` → the M2 curated tables.

Reads only the raw datasets (Noon Report, vessel_master, reference_curve, uwi,
maintenance_event, fuel_price); the ``truth/`` ground truth is never touched, so
the ETL matches what runs in production. Produces ``fact_performance_daily`` (the
ISO 15016/19030 + derived-indicator fact) plus period indicators, dimensions,
event passthroughs and the fleet aggregate. The M3 statistical layer
(``_apply_m3``) then detects point anomalies, classifies their cause, enriches
the maintenance events, emits per-vessel hull-cleaning economics and derives
overall maintenance actions — ``fact_anomaly`` / ``fact_recommendation`` /
``fact_maintenance_recommendation`` and the daily ``anomaly_*`` columns.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from ym_datalake.etl import (
    alerts,
    anomaly,
    cii,
    corrections,
    indicators,
    optimize,
    periods,
    recommendation,
    trends,
    voyages,
)
from ym_datalake.etl.filters import is_valid
from ym_datalake.synthetic_data.curves import ReferenceCurve, build_curve
from ym_datalake.synthetic_data.fleet import VesselSpec, get_vessel
from ym_datalake.synthetic_data.generate import GenerationResult

_RATINGS = ('A', 'B', 'C', 'D', 'E')


@dataclass
class CuratedResult:
    """The M2 curated tables (one list of JSON-ready dicts each)."""

    fact_performance_daily: list[dict] = field(default_factory=list)
    fact_performance_indicator: list[dict] = field(default_factory=list)
    dim_vessel: list[dict] = field(default_factory=list)
    dim_reference_curve: list[dict] = field(default_factory=list)
    fact_uwi: list[dict] = field(default_factory=list)
    fact_maintenance_event: list[dict] = field(default_factory=list)
    fact_anomaly: list[dict] = field(default_factory=list)
    fact_recommendation: list[dict] = field(default_factory=list)
    fact_maintenance_recommendation: list[dict] = field(default_factory=list)
    fact_alert: list[dict] = field(default_factory=list)
    fact_voyage: list[dict] = field(default_factory=list)
    fact_speed_profile: list[dict] = field(default_factory=list)
    agg_fleet_daily: list[dict] = field(default_factory=list)
    dim_port: list[dict] = field(default_factory=list)


def _price_index(fuel_price: list[dict]) -> dict:
    # ``date`` is a datetime.date in memory but an ISO string once written; normalise.
    return {(str(p['date'])[:10], p['fuel_type']): p['price_usd_per_mt'] for p in fuel_price}


def _group_by_imo(rows: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in rows:
        out.setdefault(r['imo_number'], []).append(r)
    return out


def _daily_row(
    noon: dict, spec: VesselSpec, curve: ReferenceCurve, prices: dict, days_since_cleaning: int, report_date: str
) -> dict:
    """One ``fact_performance_daily`` row; ISO metrics null unless steaming at sea."""
    co2 = indicators.co2_mt(noon)
    row = {
        'imo_number': noon['imo_number'],
        'report_date': report_date,
        'year': int(report_date[:4]),
        'month': int(report_date[5:7]),
        'vessel_name': noon['vessel_name'],
        'voyage_phase': noon['voyage_phase'],
        'condition_flag': noon['condition_flag'],
        # Spatial + voyage dimension carried on every row (at-sea + in-port) so the
        # per-vessel track and Fleet Map positions stay continuous.
        'latitude': noon['latitude'],
        'longitude': noon['longitude'],
        'port_from': noon['port_from'],
        'port_to': noon['port_to'],
        'voyage_no': noon['voyage_no'],
        'co2_mt': co2,
        'days_since_cleaning': days_since_cleaning,
        'days_since_dry_dock': None,
        'days_since_in_water': None,
        'resistance_wind_kn': None,
        'resistance_wave_kn': None,
        'power_corrected_kw': None,
        'speed_corrected_kn': None,
        'v_expected_kn': None,
        'speed_loss_pct': None,
        'slip_apparent': None,
        'slip_real': None,
        'sfoc_g_kwh': None,
        'admiralty_coef': None,
        'eeoi': None,
        'excess_foc_mt': None,
        'excess_cost_usd': None,
        'cum_excess_cost_usd': None,
        'excess_cost_fouling_usd': None,  # Phase 4 weather attribution
        'excess_cost_weather_usd': None,
        'excess_cost_operational_usd': None,
        'cii_aer': None,
        'cii_rating_aer': None,
        'cii_imo': None,
        'cii_rating_imo': None,
        'anomaly_flag': None,  # M3
        'anomaly_cause': None,  # M3
        'anomaly_severity': None,  # M3
        'valid_flag': False,
    }
    at_sea = noon['voyage_phase'] == 'at_sea' and noon['steaming_hours'] > 0 and noon['me_shaft_power_kw'] > 0
    if not at_sea:
        return row

    corr = corrections.wind_wave_correction(noon, spec)
    if corr['power_corrected_kw'] <= 0:
        # A gross power outlier can push corrected power non-positive; the curve
        # cannot be inverted, so leave the ISO metrics null (never valid).
        return row
    v_expected, speed_loss_pct = indicators.speed_loss(
        curve, corr['power_corrected_kw'], noon['displacement_mt'], noon['speed_tw_kn']
    )
    slip_apparent, slip_real = indicators.slips(noon)
    excess_foc = indicators.excess_foc_mt(noon, speed_loss_pct, spec.curve_n)
    price = prices.get((report_date, noon['fuel_type']))
    row.update(corr)
    row.update(
        {
            'v_expected_kn': v_expected,
            'speed_loss_pct': speed_loss_pct,
            'slip_apparent': slip_apparent,
            'slip_real': slip_real,
            'sfoc_g_kwh': indicators.sfoc_g_kwh(noon),
            'admiralty_coef': indicators.admiralty_coef(noon),
            'eeoi': indicators.eeoi(co2, noon),
            'excess_foc_mt': excess_foc,
            'excess_cost_usd': indicators.excess_cost_usd(excess_foc, price),
            'valid_flag': is_valid(noon, spec),
        }
    )
    row.update(
        indicators.excess_cost_attribution(noon, corr, row['excess_cost_usd'], row['sfoc_g_kwh'], price, spec.mcr_kw)
    )
    return row


def _build_daily(raw: GenerationResult, result: CuratedResult) -> tuple[dict, dict]:
    """Fill ``fact_performance_daily``; return (co2, distance) sums per (imo, year)."""
    prices = _price_index(raw.fuel_price)
    co2_by_iy: dict[tuple[str, int], float] = {}
    dist_by_iy: dict[tuple[str, int], float] = {}

    for imo, noon_rows in _group_by_imo(raw.noon_report).items():
        spec = get_vessel(imo)
        curve = build_curve(spec)
        noon_rows = sorted(noon_rows, key=lambda r: r['report_datetime_utc'])
        resets = periods.reset_dates(raw.maintenance_event, imo)
        dry_dock_resets = periods.reset_dates(raw.maintenance_event, imo, types=('dry_dock',))
        in_water_resets = periods.reset_dates(raw.maintenance_event, imo, types=('hull_cleaning',))
        window_start = periods.to_date(noon_rows[0]['report_datetime_utc'])

        cum_excess = 0.0
        prev_anchor = None
        for noon in noon_rows:
            report_date = noon['report_datetime_utc'][:10]
            date = periods.to_date(report_date)
            anchor = periods.latest_reset(date, resets, window_start)
            if anchor != prev_anchor:
                cum_excess = 0.0
                prev_anchor = anchor
            dsc = max(0, (date - anchor).days)
            row = _daily_row(noon, spec, curve, prices, dsc, report_date)
            row['days_since_dry_dock'] = periods.days_since_cleaning(date, dry_dock_resets, window_start)
            row['days_since_in_water'] = periods.days_since_cleaning(date, in_water_resets, window_start)
            if row['excess_cost_usd'] is not None:
                cum_excess += row['excess_cost_usd']
            row['cum_excess_cost_usd'] = cum_excess if row['excess_foc_mt'] is not None else None
            result.fact_performance_daily.append(row)

            key = (imo, row['year'])
            co2_by_iy[key] = co2_by_iy.get(key, 0.0) + row['co2_mt']
            dist_by_iy[key] = dist_by_iy.get(key, 0.0) + noon['distance_og_nm']
    return co2_by_iy, dist_by_iy


def _apply_cii(result: CuratedResult, dwt_by_imo: dict, co2_by_iy: dict, dist_by_iy: dict) -> None:
    cii_map = cii.annual_cii(co2_by_iy, dist_by_iy, dwt_by_imo)
    for row in result.fact_performance_daily:
        row.update(cii_map[(row['imo_number'], row['year'])])


def _build_dims(raw: GenerationResult, result: CuratedResult) -> None:
    latest_dry_dock: dict[str, str] = {}
    for e in raw.maintenance_event:
        if e['event_type'] == 'dry_dock':
            imo, day = e['imo_number'], str(e['event_date'])[:10]
            if day > latest_dry_dock.get(imo, ''):
                latest_dry_dock[imo] = day

    for v in raw.vessel_master:
        row = dict(v)
        row['last_dry_dock_date'] = latest_dry_dock.get(v['imo_number'], v.get('last_dry_dock_date'))
        result.dim_vessel.append(row)

    result.dim_reference_curve = [dict(r) for r in raw.reference_curve]
    result.fact_uwi = [dict(u) for u in raw.uwi]
    result.fact_maintenance_event = [
        {**dict(e), 'me_recovery_pct': None, 'payback_days': None} for e in raw.maintenance_event
    ]


def _apply_m3(raw: GenerationResult, result: CuratedResult) -> None:
    """§5 statistical layer: detect anomalies, classify causes, enrich maintenance,
    recommend cleaning. Mutates the daily rows in place; RNG seeded from imo so the
    result is order-independent and deterministic.
    """
    noon_by_imo = _group_by_imo(raw.noon_report)
    daily_by_imo = _group_by_imo(result.fact_performance_daily)
    events_by_imo = _group_by_imo(result.fact_maintenance_event)
    indic_by_imo = _group_by_imo(result.fact_performance_indicator)
    fleet_k = recommendation.hull_cleaning_cost(raw.maintenance_event)
    fleet_event_cost = recommendation.fleet_event_costs(raw.maintenance_event)

    for imo, vessel_daily in daily_by_imo.items():
        spec = get_vessel(imo)
        for row in vessel_daily:
            row['anomaly_flag'] = False
        noon_rows = noon_by_imo.get(imo, [])
        me_foc_by_date = {n['report_datetime_utc'][:10]: n['me_foc_mt'] for n in noon_rows}
        feats = {
            n['report_datetime_utc'][:10]: {
                'beaufort': n['beaufort'],
                'wave': n['wave_height_m'],
                'power': n['me_shaft_power_kw'],
                'wind': n['wind_speed_kn'],
            }
            for n in noon_rows
        }
        rng = np.random.default_rng(np.random.SeedSequence([int(imo)]))
        resets = periods.reset_dates(raw.maintenance_event, imo)
        engine_resets = periods.reset_dates(raw.maintenance_event, imo, types=('engine_overhaul', 'dry_dock'))
        segments = trends.fit_segments(vessel_daily, resets, rng)
        baselines = trends.baseline_series(vessel_daily, segments, spec.curve_n, me_foc_by_date)

        vessel_anomalies = anomaly.detect(vessel_daily, baselines, feats, spec, engine_resets)
        result.fact_anomaly.extend(vessel_anomalies)
        vessel_events = [e for e in raw.maintenance_event if e['imo_number'] == imo]
        recommendation.enrich_maintenance(events_by_imo.get(imo, []), vessel_daily, indic_by_imo.get(imo, []))
        rec = recommendation.recommend(vessel_daily, vessel_events, spec, segments, fleet_k, rng)
        result.fact_recommendation.append(rec)
        vessel_uwi = [u for u in result.fact_uwi if u['imo_number'] == imo]
        result.fact_maintenance_recommendation.extend(
            recommendation.recommend_actions(
                vessel_uwi, vessel_anomalies, rec, vessel_daily, vessel_events, fleet_event_cost
            )
        )
        result.fact_alert.extend(
            alerts.build_alerts(vessel_daily, vessel_anomalies, rec, vessel_uwi, spec, spec.fleet_id)
        )


def _agg_row(fleet_id: str, date: str, rows: list[dict]) -> dict:
    valid = [r['speed_loss_pct'] for r in rows if r['valid_flag'] and r['speed_loss_pct'] is not None]
    excess = [r['excess_cost_usd'] for r in rows if r['excess_cost_usd'] is not None]
    counts = {g: 0 for g in _RATINGS}
    for r in rows:
        if r['cii_rating_imo'] in counts:
            counts[r['cii_rating_imo']] += 1
    return {
        'fleet_id': fleet_id,
        'report_date': date,
        'year': int(date[:4]),
        'month': int(date[5:7]),
        'n_vessels': len({r['imo_number'] for r in rows}),
        'avg_speed_loss_pct': sum(valid) / len(valid) if valid else None,
        'total_excess_cost_usd': sum(excess) if excess else 0.0,
        'cii_count_a': counts['A'],
        'cii_count_b': counts['B'],
        'cii_count_c': counts['C'],
        'cii_count_d': counts['D'],
        'cii_count_e': counts['E'],
        'n_alerts': sum(1 for r in rows if r['anomaly_flag']),
    }


def _build_agg(result: CuratedResult) -> None:
    """Grain: (fleet, day). Emit an all-fleet ``'ALL'`` rollup row per date (identical to
    the historical single-grain output) plus one row per (fleet_id, date) sub-fleet."""
    by_date: dict[str, list[dict]] = {}
    by_fleet_date: dict[tuple[str, str], list[dict]] = {}
    for row in result.fact_performance_daily:
        date = row['report_date']
        fleet_id = get_vessel(row['imo_number']).fleet_id
        by_date.setdefault(date, []).append(row)
        by_fleet_date.setdefault((fleet_id, date), []).append(row)

    for date in sorted(by_date):
        result.agg_fleet_daily.append(_agg_row('ALL', date, by_date[date]))
    for fleet_id, date in sorted(by_fleet_date):
        result.agg_fleet_daily.append(_agg_row(fleet_id, date, by_fleet_date[(fleet_id, date)]))


def compute_curated(raw: GenerationResult) -> CuratedResult:
    """Compute all M2 curated tables from the raw datasets in ``raw``."""
    result = CuratedResult()
    co2_by_iy, dist_by_iy = _build_daily(raw, result)

    dwt_by_imo = {v['imo_number']: v['dwt'] for v in raw.vessel_master}
    _apply_cii(result, dwt_by_imo, co2_by_iy, dist_by_iy)

    result.dim_port = voyages.build_dim_port()
    result.fact_voyage = voyages.build_voyages(
        raw.noon_report, result.fact_performance_daily, _price_index(raw.fuel_price)
    )
    # Phase 2 — bunker/slow-steaming optimizer profile (needs the daily fouling/SFOC state).
    result.fact_speed_profile = optimize.build_speed_profiles(
        result.fact_performance_daily, raw.noon_report, raw.fuel_price
    )

    for spec in (get_vessel(imo) for imo in _group_by_imo(raw.noon_report)):
        vessel_daily = [r for r in result.fact_performance_daily if r['imo_number'] == spec.imo_number]
        result.fact_performance_indicator.extend(periods.build_indicators(vessel_daily, raw.maintenance_event, spec))

    _build_dims(raw, result)
    _apply_m3(raw, result)
    _build_agg(result)
    return result
