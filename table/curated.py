"""Curated-zone (M2 ETL + M3) table schemas for the synthetic lake, retained for reference.

No longer registered by the CDK stack — the catalog now carries the real
hackathon tables (see table.real_data).
"""

# imo_number / year / month are partition keys (projection), so they are omitted
# from the body column lists below (the redundant body keys are ignored).
FACT_PERFORMANCE_DAILY_COLUMNS = [
    ('report_date', 'string'),
    ('vessel_name', 'string'),
    ('voyage_phase', 'string'),
    ('condition_flag', 'string'),
    ('latitude', 'double'),
    ('longitude', 'double'),
    ('port_from', 'string'),
    ('port_to', 'string'),
    ('voyage_no', 'string'),
    ('co2_mt', 'double'),
    ('days_since_cleaning', 'int'),
    ('days_since_dry_dock', 'int'),
    ('days_since_in_water', 'int'),
    ('resistance_wind_kn', 'double'),
    ('resistance_wave_kn', 'double'),
    ('power_corrected_kw', 'double'),
    ('speed_corrected_kn', 'double'),
    ('v_expected_kn', 'double'),
    ('speed_loss_pct', 'double'),
    ('slip_apparent', 'double'),
    ('slip_real', 'double'),
    ('sfoc_g_kwh', 'double'),
    ('admiralty_coef', 'double'),
    ('eeoi', 'double'),
    ('excess_foc_mt', 'double'),
    ('excess_cost_usd', 'double'),
    ('cum_excess_cost_usd', 'double'),
    ('excess_cost_fouling_usd', 'double'),
    ('excess_cost_weather_usd', 'double'),
    ('excess_cost_operational_usd', 'double'),
    ('cii_aer', 'double'),
    ('cii_rating_aer', 'string'),
    ('cii_imo', 'double'),
    ('cii_rating_imo', 'string'),
    ('anomaly_flag', 'boolean'),
    ('anomaly_cause', 'string'),
    ('anomaly_severity', 'string'),
    ('valid_flag', 'boolean'),
]

FACT_PERFORMANCE_INDICATOR_COLUMNS = [
    ('indicator', 'string'),
    ('period_start', 'string'),
    ('period_end', 'string'),
    ('event_type', 'string'),
    ('event_date', 'string'),
    ('value', 'double'),
    ('reference_value', 'double'),
    ('detail', 'string'),
]

FACT_UWI_COLUMNS = [
    ('inspection_id', 'string'),
    ('inspection_date', 'string'),
    ('inspection_type', 'string'),
    ('hull_fouling_rating', 'int'),
    ('hull_fouling_coverage_pct', 'double'),
    ('propeller_condition', 'string'),
    ('propeller_roughness_um', 'double'),
    ('coating_breakdown_pct', 'double'),
    ('coating_condition', 'string'),
    ('recommended_action', 'string'),
]

FACT_MAINTENANCE_EVENT_COLUMNS = [
    ('event_id', 'string'),
    ('event_date', 'string'),
    ('event_type', 'string'),
    ('cost_usd', 'double'),
    ('downtime_hours', 'double'),
    ('location', 'string'),
    ('me_recovery_pct', 'double'),
    ('payback_days', 'double'),
]

AGG_FLEET_DAILY_COLUMNS = [
    ('fleet_id', 'string'),
    ('report_date', 'string'),
    ('year', 'int'),
    ('month', 'int'),
    ('n_vessels', 'int'),
    ('avg_speed_loss_pct', 'double'),
    ('total_excess_cost_usd', 'double'),
    ('cii_count_a', 'int'),
    ('cii_count_b', 'int'),
    ('cii_count_c', 'int'),
    ('cii_count_d', 'int'),
    ('cii_count_e', 'int'),
    ('n_alerts', 'int'),
]

# imo_number / year / month are partition keys (projection), so they are omitted.
FACT_ANOMALY_COLUMNS = [
    ('report_date', 'string'),
    ('metric', 'string'),
    ('value', 'double'),
    ('z_score', 'double'),
    ('severity', 'string'),
    ('cause', 'string'),
]

# imo_number is the partition key (projection), so it is omitted here. Early-warning
# alert episodes promoted over fact_anomaly + fact_recommendation (M3, alerts.py).
FACT_ALERT_COLUMNS = [
    ('alert_id', 'string'),
    ('fleet_id', 'string'),
    ('opened_date', 'string'),
    ('last_seen_date', 'string'),
    ('cause', 'string'),
    ('severity', 'string'),
    ('driver_metric', 'string'),
    ('peak_value', 'double'),
    ('peak_z', 'double'),
    ('excess_cost_usd', 'double'),
    ('recommended_action', 'string'),
    ('status', 'string'),
    ('source', 'string'),
    ('message_zh', 'string'),
    ('message_en', 'string'),
]

FACT_RECOMMENDATION_COLUMNS = [
    ('imo_number', 'string'),
    ('last_cleaning_date', 'string'),
    ('recommended_clean_date', 'string'),
    ('trigger_eta', 'string'),
    ('t_star_days', 'double'),
    ('fouling_rate_pct_per_day', 'double'),
    ('net_saving_usd', 'double'),
    ('status', 'string'),
]

FACT_MAINTENANCE_RECOMMENDATION_COLUMNS = [
    ('imo_number', 'string'),
    ('action_type', 'string'),
    ('priority', 'string'),
    ('due_date', 'string'),
    ('rationale', 'string'),
    ('source', 'string'),
    # Per-action analytics (parity with fact_recommendation); nullable.
    ('degradation_rate', 'double'),
    ('degradation_unit', 'string'),
    ('current_value', 'double'),
    ('threshold_value', 'double'),
    ('trigger_eta', 'string'),
    ('t_star_days', 'double'),
    ('net_saving_usd', 'double'),
    # Consolidated planner: the service window this action is batched into.
    ('plan_date', 'string'),
    ('plan_service_type', 'string'),
]

DIM_PORT_COLUMNS = [
    ('locode', 'string'),
    ('name', 'string'),
    ('lat', 'double'),
    ('lon', 'double'),
    ('is_eu', 'boolean'),
]

# imo_number is the partition key (projection), so it is omitted here. Grain is
# (imo, voyage_no) — one rotation leg incl. its in-port day, with per-voyage economics.
FACT_VOYAGE_COLUMNS = [
    ('voyage_no', 'string'),
    ('vessel_name', 'string'),
    ('from_port', 'string'),
    ('to_port', 'string'),
    ('depart_date', 'string'),
    ('arrive_date', 'string'),
    ('distance_nm', 'double'),
    ('sea_days', 'int'),
    ('avg_speed_kn', 'double'),
    ('total_foc_mt', 'double'),
    ('fuel_cost_usd', 'double'),
    ('co2_mt', 'double'),
    ('avg_speed_loss_pct', 'double'),
    ('usd_per_nm', 'double'),
    ('on_time_flag', 'boolean'),
    ('planned_eta', 'string'),
]

# imo_number is the partition key (projection), so it is omitted here. Grain is
# (imo, speed_kn) — one speed-grid point per vessel, with the convex usd/nm curve,
# fuel decomposition, and the vessel-level current/economical speed repeated per row.
FACT_SPEED_PROFILE_COLUMNS = [
    ('speed_kn', 'double'),
    ('shaft_power_kw', 'double'),
    ('foc_mt_per_day', 'double'),
    ('co2_mt_per_day', 'double'),
    ('fuel_usd_per_day', 'double'),
    ('charter_usd_per_day', 'double'),
    ('usd_per_day', 'double'),
    ('usd_per_nm', 'double'),
    ('fuel_usd_per_nm', 'double'),
    ('vessel_name', 'string'),
    ('recommended_speed_kn', 'double'),
    ('current_speed_kn', 'double'),
    ('annual_distance_nm', 'double'),
]
