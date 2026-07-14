"""Raw-zone (M1) table schemas for the synthetic lake, retained for reference.

No longer registered by the CDK stack — the catalog now carries the real
hackathon tables (see table.real_data).
"""

# Raw-zone table schemas: (column_name, glue_type). Column names match the JSONL
# keys emitted by ym_datalake.synthetic_data (openx JsonSerDe maps by name).
VESSEL_MASTER_COLUMNS = [
    ('imo_number', 'string'),
    ('vessel_name', 'string'),
    ('vessel_type', 'string'),
    ('fleet_id', 'string'),
    ('fleet_name', 'string'),
    ('build_year', 'int'),
    ('lpp_m', 'double'),
    ('breadth_m', 'double'),
    ('design_draft_m', 'double'),
    ('dwt', 'double'),
    ('gross_tonnage', 'double'),
    ('mcr_kw', 'double'),
    ('ncr_kw', 'double'),
    ('design_speed_kn', 'double'),
    ('propeller_type', 'string'),
    ('diameter_m', 'double'),
    ('pitch_m', 'double'),
    ('n_blades', 'int'),
    ('transverse_area_m2', 'double'),
    ('ref_curve_id', 'string'),
    ('last_dry_dock_date', 'string'),
]

REFERENCE_CURVE_COLUMNS = [
    ('ref_curve_id', 'string'),
    ('imo_number', 'string'),
    ('speed_kn', 'double'),
    ('shaft_power_kw', 'double'),
    ('displacement_ref_mt', 'double'),
]

UWI_COLUMNS = [
    ('inspection_id', 'string'),
    ('imo_number', 'string'),
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

MAINTENANCE_EVENT_COLUMNS = [
    ('event_id', 'string'),
    ('imo_number', 'string'),
    ('event_date', 'string'),
    ('event_type', 'string'),
    ('cost_usd', 'double'),
    ('downtime_hours', 'double'),
    ('location', 'string'),
]

FUEL_PRICE_COLUMNS = [
    ('date', 'string'),
    ('fuel_type', 'string'),
    ('price_usd_per_mt', 'double'),
]

# noon_report body columns — imo_number and year are partition keys (projection),
# so they are omitted here (the redundant body imo_number key is ignored).
NOON_REPORT_COLUMNS = [
    ('report_id', 'string'),
    ('vessel_name', 'string'),
    ('report_datetime_utc', 'string'),
    ('voyage_no', 'string'),
    ('leg', 'string'),
    ('port_from', 'string'),
    ('port_to', 'string'),
    ('voyage_phase', 'string'),
    ('latitude', 'double'),
    ('longitude', 'double'),
    ('heading_deg', 'double'),
    ('steaming_hours', 'double'),
    ('distance_og_nm', 'double'),
    ('distance_tw_nm', 'double'),
    ('speed_og_kn', 'double'),
    ('speed_tw_kn', 'double'),
    ('me_rpm', 'double'),
    ('me_shaft_power_kw', 'double'),
    ('me_foc_mt', 'double'),
    ('propeller_pitch_m', 'double'),
    ('fuel_type', 'string'),
    ('fuel_lcv_mj_kg', 'double'),
    ('ae_foc_mt', 'double'),
    ('boiler_foc_mt', 'double'),
    ('total_foc_mt', 'double'),
    ('draft_fore_m', 'double'),
    ('draft_aft_m', 'double'),
    ('mean_draft_m', 'double'),
    ('trim_m', 'double'),
    ('displacement_mt', 'double'),
    ('cargo_weight_mt', 'double'),
    ('condition_flag', 'string'),
    ('wind_speed_kn', 'double'),
    ('wind_dir_deg', 'double'),
    ('beaufort', 'int'),
    ('wave_height_m', 'double'),
    ('wave_dir_deg', 'double'),
    ('wave_period_s', 'double'),
    ('swell_height_m', 'double'),
    ('swell_dir_deg', 'double'),
    ('sea_water_temp_c', 'double'),
    ('air_temp_c', 'double'),
    ('air_pressure_hpa', 'double'),
    ('current_speed_kn', 'double'),
    ('current_dir_deg', 'double'),
    ('sea_water_density_kg_m3', 'double'),
    ('data_source', 'string'),
]
