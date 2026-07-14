"""Allow-listed ``query_type`` → parameterized SQL for the Dashboard (poc-spec §8.6).

Each builder returns ``(sql, bind_values)`` where every user value is an Athena ``?``
placeholder — the values never touch the SQL text. Pydantic validates/normalizes the
params first (defense-in-depth + clean 400s); unknown types/params raise BadRequestError.

All binds here are strings compared to string columns; ``config.start_query`` renders them
as single-quoted Athena string literals (Athena's requirement for string execution
parameters), so the builders just pass the raw values.
"""

from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from pydantic import BaseModel, ConfigDict, Field, ValidationError

_IMO_PATTERN = r'^\d{7}$'
_DATE_PATTERN = r'^\d{4}-\d{2}-\d{2}$'
# Fleet grouping id: the synthetic all-fleet rollup 'ALL' or a 'FL-XX' sub-fleet.
_FLEET_PATTERN = r'^(ALL|FL-[A-Z]{2,})$'
_SEVERITY_PATTERN = r'^(low|medium|high)$'
# Real-dataset ship id: S1-S12 (training) or S21-S23 (prediction).
_SHIP_PATTERN = r'^S([1-9]|1[0-2]|2[1-3])$'


class _DateRangeParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    start_date: str | None = Field(default=None, pattern=_DATE_PATTERN)
    end_date: str | None = Field(default=None, pattern=_DATE_PATTERN)


class _FleetOverviewParams(_DateRangeParams):
    fleet_id: str = Field(default='ALL', pattern=_FLEET_PATTERN)


class _FleetAlertsParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    fleet_id: str = Field(default='ALL', pattern=_FLEET_PATTERN)
    severity: str | None = Field(default=None, pattern=_SEVERITY_PATTERN)


class _ImoParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    imo_number: str = Field(pattern=_IMO_PATTERN)


class _ImoDateRangeParams(_ImoParams):
    start_date: str | None = Field(default=None, pattern=_DATE_PATTERN)
    end_date: str | None = Field(default=None, pattern=_DATE_PATTERN)


class _NoParams(BaseModel):
    model_config = ConfigDict(extra='forbid')


def _date_range(column: str, start: str | None, end: str | None, *, keyword: str) -> tuple[str, list[str]]:
    """Build an optional date-range clause. ``keyword`` is WHERE or AND (report_date is a
    YYYY-MM-DD string column, so lexicographic comparison is chronological)."""
    if start and end:
        return f' {keyword} {column} BETWEEN ? AND ?', [start, end]
    if start:
        return f' {keyword} {column} >= ?', [start]
    if end:
        return f' {keyword} {column} <= ?', [end]
    return '', []


def _fleet_overview(p: _FleetOverviewParams) -> tuple[str, list[str]]:
    # agg_fleet_daily grain is (fleet, day); fleet_id='ALL' (default) is the all-fleet rollup.
    sql = (
        'SELECT report_date, n_vessels, avg_speed_loss_pct, total_excess_cost_usd, '
        'cii_count_a, cii_count_b, cii_count_c, cii_count_d, cii_count_e, n_alerts '
        'FROM agg_fleet_daily WHERE fleet_id = ?'
    )
    clause, binds = _date_range('report_date', p.start_date, p.end_date, keyword='AND')
    return sql + clause + ' ORDER BY report_date', [p.fleet_id, *binds]


def _vessel_speed_loss(p: _ImoDateRangeParams) -> tuple[str, list[str]]:
    sql = (
        'SELECT report_date, speed_loss_pct, v_expected_kn, days_since_cleaning, valid_flag '
        'FROM fact_performance_daily WHERE imo_number = ?'
    )
    clause, binds = _date_range('report_date', p.start_date, p.end_date, keyword='AND')
    return sql + clause + ' ORDER BY report_date', [p.imo_number, *binds]


def _vessel_metrics(p: _ImoDateRangeParams) -> tuple[str, list[str]]:
    # Full daily metric set powering the Deep-dive Slip/SFOC/Admiralty/fuel/CII panels.
    sql = (
        'SELECT report_date, speed_loss_pct, v_expected_kn, slip_real, slip_apparent, '
        'sfoc_g_kwh, admiralty_coef, eeoi, cii_aer, cii_rating_aer, cii_imo, cii_rating_imo, '
        'excess_cost_usd, cum_excess_cost_usd, excess_cost_fouling_usd, excess_cost_weather_usd, '
        'excess_cost_operational_usd, power_corrected_kw, resistance_wind_kn, '
        'resistance_wave_kn, co2_mt, days_since_cleaning, days_since_dry_dock, days_since_in_water, '
        'anomaly_flag, valid_flag '
        'FROM fact_performance_daily WHERE imo_number = ?'
    )
    clause, binds = _date_range('report_date', p.start_date, p.end_date, keyword='AND')
    return sql + clause + ' ORDER BY report_date', [p.imo_number, *binds]


def _fleet_vessels(p: _NoParams) -> tuple[str, list[str]]:
    # Fleet roster + deep-dive header specs; fleet_id/fleet_name scope the fleet filter.
    return (
        'SELECT imo_number, vessel_name, vessel_type, build_year, lpp_m, breadth_m, '
        'dwt, mcr_kw, design_speed_kn, last_dry_dock_date, fleet_id, fleet_name '
        'FROM dim_vessel ORDER BY imo_number',
        [],
    )


def _fleet_list(p: _NoParams) -> tuple[str, list[str]]:
    # Distinct operational fleets for the Fleet Overview grouping dropdown.
    return ('SELECT DISTINCT fleet_id, fleet_name FROM dim_vessel ORDER BY fleet_id', [])


def _vessel_speed_power(p: _ImoParams) -> tuple[str, list[str]]:
    # Measured points + reference curve, aligned to (series, speed_kn, power_kw, days_since_cleaning).
    sql = (
        "SELECT 'measured' AS series, speed_corrected_kn AS speed_kn, "
        'power_corrected_kw AS power_kw, days_since_cleaning '
        'FROM fact_performance_daily WHERE imo_number = ? AND valid_flag '
        'UNION ALL '
        "SELECT 'reference' AS series, speed_kn, shaft_power_kw AS power_kw, "
        'CAST(NULL AS integer) AS days_since_cleaning '
        'FROM dim_reference_curve WHERE imo_number = ?'
    )
    return sql, [p.imo_number, p.imo_number]


def _vessel_anomalies(p: _ImoParams) -> tuple[str, list[str]]:
    return (
        'SELECT report_date, metric, value, z_score, severity, cause '
        'FROM fact_anomaly WHERE imo_number = ? ORDER BY report_date',
        [p.imo_number],
    )


_ALERT_COLUMNS = (
    'alert_id, fleet_id, opened_date, last_seen_date, cause, severity, driver_metric, '
    'peak_value, peak_z, excess_cost_usd, recommended_action, status, source, message_zh, message_en'
)


def _fleet_alerts(p: _FleetAlertsParams) -> tuple[str, list[str]]:
    # Fleet-wide open alert episodes (fact_alert), newest first; optional fleet/severity filter.
    sql = f'SELECT imo_number, {_ALERT_COLUMNS} FROM fact_alert WHERE status = ?'
    binds = ['open']
    if p.fleet_id != 'ALL':
        sql += ' AND fleet_id = ?'
        binds.append(p.fleet_id)
    if p.severity is not None:
        sql += ' AND severity = ?'
        binds.append(p.severity)
    return sql + ' ORDER BY last_seen_date DESC', binds


def _vessel_alerts(p: _ImoParams) -> tuple[str, list[str]]:
    # One vessel's open alert episodes (partition-pruned), newest first.
    return (
        f'SELECT {_ALERT_COLUMNS} FROM fact_alert WHERE imo_number = ? ORDER BY last_seen_date DESC',
        [p.imo_number],
    )


def _vessel_maintenance_effect(p: _ImoParams) -> tuple[str, list[str]]:
    return (
        'SELECT event_date, event_type, cost_usd, downtime_hours, me_recovery_pct, payback_days '
        'FROM fact_maintenance_event WHERE imo_number = ? ORDER BY event_date',
        [p.imo_number],
    )


def _vessel_recommendation(p: _ImoParams) -> tuple[str, list[str]]:
    return (
        'SELECT last_cleaning_date, recommended_clean_date, trigger_eta, t_star_days, '
        'fouling_rate_pct_per_day, net_saving_usd, status '
        'FROM fact_recommendation WHERE imo_number = ?',
        [p.imo_number],
    )


def _vessel_maintenance_recommendation(p: _ImoParams) -> tuple[str, list[str]]:
    # Overall maintenance actions, grouped by planned service window (plan_date) then
    # priority (high→medium→low) then action_type — so rows arrive pre-grouped by window.
    # Each row self-carries its analytics strip (rate/threshold/ETA/t*/net-saving) and the
    # planner's window tags (plan_date / plan_service_type).
    return (
        'SELECT action_type, priority, due_date, rationale, source, '
        'degradation_rate, degradation_unit, current_value, threshold_value, '
        'trigger_eta, t_star_days, net_saving_usd, plan_date, plan_service_type '
        'FROM fact_maintenance_recommendation WHERE imo_number = ? '
        "ORDER BY plan_date, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, action_type",
        [p.imo_number],
    )


def _fleet_maintenance_recommendation(p: _NoParams) -> tuple[str, list[str]]:
    # Fleet-wide backlog for the Planner. est_cost_usd = indicative capex, the median historical
    # cost_usd of the matching maintenance event_type (engine_inspection→engine_overhaul).
    return (
        'SELECT r.imo_number, r.action_type, r.priority, r.due_date, r.rationale, r.source, '
        'r.degradation_rate, r.degradation_unit, r.current_value, r.threshold_value, '
        'r.trigger_eta, r.t_star_days, r.net_saving_usd, r.plan_date, r.plan_service_type, '
        'e.est_cost_usd FROM fact_maintenance_recommendation r '
        'LEFT JOIN (SELECT event_type, approx_percentile(cost_usd, 0.5) AS est_cost_usd '
        'FROM fact_maintenance_event GROUP BY event_type) e '
        "ON e.event_type = CASE r.action_type WHEN 'engine_inspection' THEN 'engine_overhaul' "
        'ELSE r.action_type END '
        "ORDER BY r.plan_date, CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, "
        'r.action_type',
        [],
    )


def _vessel_track(p: _ImoDateRangeParams) -> tuple[str, list[str]]:
    # Daily positions + speed-loss / CII for the Deep-dive per-vessel track map.
    sql = (
        'SELECT report_date, latitude, longitude, speed_loss_pct, cii_rating_aer, '
        'voyage_no, port_from, port_to FROM fact_performance_daily WHERE imo_number = ?'
    )
    clause, binds = _date_range('report_date', p.start_date, p.end_date, keyword='AND')
    return sql + clause + ' ORDER BY report_date', [p.imo_number, *binds]


def _vessel_voyages(p: _ImoParams) -> tuple[str, list[str]]:
    # Per-voyage economics for the Deep-dive sortable voyage table, oldest first.
    return (
        'SELECT voyage_no, vessel_name, from_port, to_port, depart_date, arrive_date, '
        'distance_nm, sea_days, avg_speed_kn, total_foc_mt, fuel_cost_usd, co2_mt, '
        'avg_speed_loss_pct, usd_per_nm, on_time_flag, planned_eta '
        'FROM fact_voyage WHERE imo_number = ? ORDER BY depart_date',
        [p.imo_number],
    )


def _vessel_speed_profile(p: _ImoParams) -> tuple[str, list[str]]:
    # Bunker-optimizer speed grid: the convex usd/nm-vs-speed curve + fuel decomposition,
    # with the vessel-level current / recommended (economical) speed and annual distance
    # repeated on every row. Ordered by speed so the frontend can draw a line directly.
    return (
        'SELECT speed_kn, shaft_power_kw, foc_mt_per_day, co2_mt_per_day, fuel_usd_per_day, '
        'charter_usd_per_day, usd_per_day, usd_per_nm, fuel_usd_per_nm, vessel_name, '
        'recommended_speed_kn, current_speed_kn, annual_distance_nm '
        'FROM fact_speed_profile WHERE imo_number = ? ORDER BY speed_kn',
        [p.imo_number],
    )


def _fleet_positions(p: _NoParams) -> tuple[str, list[str]]:
    # Latest daily row per vessel for the Fleet Map (one dot each). report_date is a
    # YYYY-MM-DD string, so DESC is chronological; the window picks the newest per imo.
    return (
        'SELECT imo_number, vessel_name, report_date, latitude, longitude, speed_loss_pct, '
        'cii_rating_aer, voyage_phase, port_from, port_to, voyage_no FROM ('
        'SELECT imo_number, vessel_name, report_date, latitude, longitude, speed_loss_pct, '
        'cii_rating_aer, voyage_phase, port_from, port_to, voyage_no, '
        'row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC) AS rn '
        'FROM fact_performance_daily) WHERE rn = 1 ORDER BY imo_number',
        [],
    )


def _vessel_uwi(p: _ImoParams) -> tuple[str, list[str]]:
    # Underwater-inspection findings, chronological (latest row = current condition panel).
    return (
        'SELECT inspection_date, inspection_type, hull_fouling_rating, hull_fouling_coverage_pct, '
        'propeller_condition, propeller_roughness_um, coating_breakdown_pct, coating_condition, recommended_action '
        'FROM fact_uwi WHERE imo_number = ? ORDER BY inspection_date',
        [p.imo_number],
    )


# --- Real-dataset query types (vt_fd / maintenance; ship_id + relative-day axis) ---


class _ShipParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    ship_id: str = Field(pattern=_SHIP_PATTERN)


class _ShipDayRangeParams(_ShipParams):
    start_day: int | None = Field(default=None, ge=0)
    end_day: int | None = Field(default=None, ge=0)


class _OptionalShipParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    ship_id: str | None = Field(default=None, pattern=_SHIP_PATTERN)


class _DayRangeParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    start_day: int | None = Field(default=None, ge=0)
    end_day: int | None = Field(default=None, ge=0)


def _day_range(column: str, start: int | None, end: int | None, *, keyword: str) -> tuple[str, list[str]]:
    """Optional relative-day range clause. Binds render as string literals, so the
    integer column comparison needs an explicit CAST on each placeholder."""
    if start is not None and end is not None:
        return f' {keyword} {column} BETWEEN CAST(? AS integer) AND CAST(? AS integer)', [str(start), str(end)]
    if start is not None:
        return f' {keyword} {column} >= CAST(? AS integer)', [str(start)]
    if end is not None:
        return f' {keyword} {column} <= CAST(? AS integer)', [str(end)]
    return '', []


# Daily signal set for one ship: navigation, drafts/loading, weather, engine, fuels, markers.
_SHIP_DAILY_COLUMNS = (
    'noon_utc, voyage, avg_speed, speed_through_water, me_avg_rpm, propeller_speed, '
    'fore_draft, after_draft, mid_draft, displacement, cargo_on_board, '
    'wind_scale, wind_speed, sea_height, swell_height, sea_water_temp, water_depth, '
    'total_distance, sea_speed_distance, hours_full_speed, hours_total, '
    'horse_power, load_pct, sfoc, me_slip, total_consump, me_consumption, '
    'me_fullspeed_consump_hshfo, me_fullspeed_consump_ulsfo, me_fullspeed_consump_vlsfo, '
    'me_fullspeed_consump_lsmgo, me_fullspeed_consump_bio_hsfo, masked_flag, predict_fuel_type'
)


def _ship_list(p: _NoParams) -> tuple[str, list[str]]:
    # Roster: per-ship coverage + placeholder counts (S21-S23 carry the PREDICT cells).
    return (
        'SELECT ship_id, count(*) AS n_rows, min(noon_utc) AS first_day, max(noon_utc) AS last_day, '
        'count(predict_fuel_type) AS n_predict, '
        'sum(CASE WHEN masked_flag THEN 1 ELSE 0 END) AS n_masked '
        'FROM vt_fd GROUP BY ship_id ORDER BY ship_id',
        [],
    )


def _ship_daily(p: _ShipDayRangeParams) -> tuple[str, list[str]]:
    sql = f'SELECT {_SHIP_DAILY_COLUMNS} FROM vt_fd WHERE ship_id = ?'
    clause, binds = _day_range('noon_utc', p.start_day, p.end_day, keyword='AND')
    return sql + clause + ' ORDER BY noon_utc', [p.ship_id, *binds]


def _ship_maintenance(p: _ShipParams) -> tuple[str, list[str]]:
    return (
        'SELECT event_day, event_type, propeller_condition, hull_fouling_type, '
        'hull_coating_condition, cavitation_found, draft_fwd_m, draft_aft_m '
        'FROM maintenance WHERE ship_id = ? ORDER BY event_day',
        [p.ship_id],
    )


def _predict_targets(p: _OptionalShipParams) -> tuple[str, list[str]]:
    # The PREDICT cells (102 total) + context columns for the prediction workflow.
    sql = (
        'SELECT ship_id, noon_utc, predict_fuel_type, hours_full_speed, wind_scale, '
        'avg_speed, speed_through_water, me_avg_rpm '
        'FROM vt_fd WHERE predict_fuel_type IS NOT NULL'
    )
    binds: list[str] = []
    if p.ship_id is not None:
        sql += ' AND ship_id = ?'
        binds.append(p.ship_id)
    return sql + ' ORDER BY ship_id, noon_utc', binds


def _ship_speed_power(p: _ShipParams) -> tuple[str, list[str]]:
    # STW-vs-power scatter points for performance-curve fitting; client filters further
    # (e.g. hours_full_speed >= 22, wind_scale <= 4) as the ISO-style steady-state gate.
    return (
        'SELECT noon_utc, speed_through_water, horse_power, me_avg_rpm, displacement, '
        'wind_scale, hours_full_speed '
        'FROM vt_fd WHERE ship_id = ? AND horse_power IS NOT NULL AND speed_through_water IS NOT NULL '
        'ORDER BY noon_utc',
        [p.ship_id],
    )


class _AlertFilterParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    severity: str | None = Field(default=None, pattern=_SEVERITY_PATTERN)


_SHIP_ALERT_COLUMNS = (
    'alert_id, metric, opened_day, last_seen_day, n_days, peak_value, peak_z, severity, status, message'
)
_SHIP_RECO_COLUMNS = (
    'action_type, priority, due_day, current_value, threshold_value, rate_per_day, trigger_eta_day, rationale'
)
_RECO_PRIORITY_ORDER = "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END"


def _ship_speed_loss(p: _ShipDayRangeParams) -> tuple[str, list[str]]:
    # ISO-style speed-loss trend from the curated daily table (compute-real output).
    sql = (
        'SELECT noon_utc, speed_loss_pct, v_expected_kn, days_since_cleaning, days_since_polish, valid_flag '
        'FROM fact_ship_daily WHERE ship_id = ?'
    )
    clause, binds = _day_range('noon_utc', p.start_day, p.end_day, keyword='AND')
    return sql + clause + ' ORDER BY noon_utc', [p.ship_id, *binds]


def _ship_anomalies(p: _ShipParams) -> tuple[str, list[str]]:
    return (
        'SELECT noon_utc, metric, value, z_score, severity FROM fact_ship_anomaly WHERE ship_id = ? ORDER BY noon_utc',
        [p.ship_id],
    )


def _ship_alerts(p: _ShipParams) -> tuple[str, list[str]]:
    return (
        f'SELECT {_SHIP_ALERT_COLUMNS} FROM fact_ship_alert WHERE ship_id = ? ORDER BY last_seen_day DESC',
        [p.ship_id],
    )


def _fleet_ship_alerts(p: _AlertFilterParams) -> tuple[str, list[str]]:
    sql = f"SELECT ship_id, {_SHIP_ALERT_COLUMNS} FROM fact_ship_alert WHERE status = 'open'"
    binds: list[str] = []
    if p.severity is not None:
        sql += ' AND severity = ?'
        binds.append(p.severity)
    return sql + ' ORDER BY last_seen_day DESC', binds


def _ship_maintenance_recommendation(p: _ShipParams) -> tuple[str, list[str]]:
    return (
        f'SELECT {_SHIP_RECO_COLUMNS} FROM fact_ship_maintenance_recommendation '
        f'WHERE ship_id = ? ORDER BY {_RECO_PRIORITY_ORDER}, action_type',
        [p.ship_id],
    )


def _fleet_ship_maintenance_recommendation(p: _NoParams) -> tuple[str, list[str]]:
    return (
        f'SELECT ship_id, {_SHIP_RECO_COLUMNS} FROM fact_ship_maintenance_recommendation '
        f'ORDER BY due_day, {_RECO_PRIORITY_ORDER}, action_type',
        [],
    )


def _fleet_daily(p: _DayRangeParams) -> tuple[str, list[str]]:
    # Cross-ship per-day aggregate. noon_utc is per-ship relative (day 0 = that ship's
    # earliest record), so this is an approximate overview, not a calendar alignment.
    sql = (
        'SELECT noon_utc, count(*) AS n_ships, avg(avg_speed) AS avg_sog, '
        'avg(speed_through_water) AS avg_stw, sum(total_consump) AS total_consump_mt, '
        'avg(wind_scale) AS avg_wind_scale FROM vt_fd'
    )
    clause, binds = _day_range('noon_utc', p.start_day, p.end_day, keyword='WHERE')
    return sql + clause + ' GROUP BY noon_utc ORDER BY noon_utc', binds


# query_type → (pydantic param model, SQL builder).
QUERY_TYPES = {
    'fleet_overview': (_FleetOverviewParams, _fleet_overview),
    'fleet_vessels': (_NoParams, _fleet_vessels),
    'fleet_list': (_NoParams, _fleet_list),
    'fleet_alerts': (_FleetAlertsParams, _fleet_alerts),
    'vessel_speed_loss': (_ImoDateRangeParams, _vessel_speed_loss),
    'vessel_metrics': (_ImoDateRangeParams, _vessel_metrics),
    'vessel_speed_power': (_ImoParams, _vessel_speed_power),
    'vessel_anomalies': (_ImoParams, _vessel_anomalies),
    'vessel_alerts': (_ImoParams, _vessel_alerts),
    'vessel_maintenance_effect': (_ImoParams, _vessel_maintenance_effect),
    'vessel_recommendation': (_ImoParams, _vessel_recommendation),
    'vessel_maintenance_recommendation': (_ImoParams, _vessel_maintenance_recommendation),
    'fleet_maintenance_recommendation': (_NoParams, _fleet_maintenance_recommendation),
    'vessel_uwi': (_ImoParams, _vessel_uwi),
    'vessel_track': (_ImoDateRangeParams, _vessel_track),
    'vessel_voyages': (_ImoParams, _vessel_voyages),
    'vessel_speed_profile': (_ImoParams, _vessel_speed_profile),
    'fleet_positions': (_NoParams, _fleet_positions),
}

# v2 (/v2/queries): real-dataset types over vt_fd / maintenance. Reuses the v1
# type names where a counterpart exists (the version path is the namespace) so
# Dashboard code keeps its query_type strings; params differ (ship_id + relative
# days instead of imo_number + dates).
QUERY_TYPES_V2 = {
    'fleet_overview': (_DayRangeParams, _fleet_daily),
    'fleet_vessels': (_NoParams, _ship_list),
    'vessel_metrics': (_ShipDayRangeParams, _ship_daily),
    'vessel_speed_power': (_ShipParams, _ship_speed_power),
    'vessel_maintenance_effect': (_ShipParams, _ship_maintenance),
    'predict_targets': (_OptionalShipParams, _predict_targets),
    # Curated types — need `python -m ym_datalake.etl compute-real --upload` to have run.
    'vessel_speed_loss': (_ShipDayRangeParams, _ship_speed_loss),
    'vessel_anomalies': (_ShipParams, _ship_anomalies),
    'vessel_alerts': (_ShipParams, _ship_alerts),
    'fleet_alerts': (_AlertFilterParams, _fleet_ship_alerts),
    'vessel_maintenance_recommendation': (_ShipParams, _ship_maintenance_recommendation),
    'fleet_maintenance_recommendation': (_NoParams, _fleet_ship_maintenance_recommendation),
}


def render(query_type: str, params: dict, types: dict | None = None) -> tuple[str, list[str]]:
    """Validate ``params`` and return ``(sql, bind_values)`` for ``query_type``.

    ``types`` selects the registry (default v1 ``QUERY_TYPES``; pass
    ``QUERY_TYPES_V2`` for the real-dataset catalog). Raises BadRequestError for
    an unknown type or invalid params (→ HTTP 400).
    """
    registry = QUERY_TYPES if types is None else types
    entry = registry.get(query_type)
    if entry is None:
        raise BadRequestError(f'Unknown query_type {query_type!r}. Allowed: {sorted(registry)}')
    model_cls, builder = entry
    try:
        validated = model_cls.model_validate(params or {})
    except ValidationError as e:
        raise BadRequestError(f'Invalid params for {query_type}: {e.errors(include_url=False)}')
    return builder(validated)
