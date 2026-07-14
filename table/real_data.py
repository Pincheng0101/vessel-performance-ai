"""Real hackathon dataset schemas (data/vt_fd.csv, data/maintenance.csv).

Ship ids (S1-S23) replace IMO numbers here. Storage is JSONL like the rest of
the lake; the CSV->JSONL loader converts HIDDEN/PREDICT placeholder cells to
null and sets the two marker columns (masked_flag, predict_fuel_type).
"""

# S1-S12 training ships, S21-S23 prediction ships.
SHIP_IDS = [f'S{i}' for i in range(1, 13)] + ['S21', 'S22', 'S23']

# vt_fd body columns — ship_id ('De-identification Name') is the partition key
# (projection), so it is omitted here. Grain: one row per ship per noon report;
# the source carries duplicate (ship_id, noon_utc) rows, kept verbatim in raw.
VT_FD_COLUMNS = [
    ('voyage', 'string'),
    ('noon_utc', 'int'),  # relative day; day 0 = the ship's earliest record
    ('avg_speed', 'double'),  # SOG, kn
    ('speed_through_water', 'double'),  # STW, kn
    ('me_avg_rpm', 'double'),
    ('propeller_speed', 'double'),
    ('fore_draft', 'double'),  # m
    ('after_draft', 'double'),  # m
    ('displacement', 'double'),  # MT
    ('cargo_on_board', 'double'),  # MT
    ('wind_scale', 'double'),  # Beaufort
    ('sea_height', 'double'),  # m
    ('sea_water_temp', 'double'),  # deg C
    ('wind_speed', 'double'),  # kn
    ('wind_direction', 'double'),  # compass points 0-15
    ('swell_height', 'double'),  # m
    ('swell_direction', 'double'),  # compass points 0-15
    ('sea_direction', 'double'),  # compass points 0-15
    ('water_depth', 'double'),  # m
    ('mid_draft', 'double'),  # m
    ('total_distance', 'double'),  # nm over ground
    ('sea_speed_distance', 'double'),  # nm through water, full-speed hours
    ('diff_stw_sog_slip', 'double'),  # STW-SOG delta (current proxy)
    ('full_spd_stw_slip', 'double'),  # %
    ('horse_power', 'double'),  # kW
    ('load_pct', 'double'),  # %MCR
    ('sfoc', 'double'),  # g/kWh
    ('me_slip', 'double'),  # %
    ('thrust', 'double'),  # kN
    ('thrust_quotient', 'double'),
    ('total_consump', 'double'),  # MT/day incl. aux/boiler
    ('me_consumption', 'double'),  # MT/day
    # Full-speed ME consumption per fuel, MT/day. HIDDEN/PREDICT cells -> null.
    ('me_fullspeed_consump_hshfo', 'double'),
    ('me_fullspeed_consump_ulsfo', 'double'),
    ('me_fullspeed_consump_vlsfo', 'double'),
    ('me_fullspeed_consump_lsmgo', 'double'),
    ('me_fullspeed_consump_bio_hsfo', 'double'),
    ('hours_full_speed', 'double'),  # hr
    ('hours_total', 'double'),  # hr
    # Loader-set markers (no CSV counterpart).
    ('masked_flag', 'boolean'),  # row had any HIDDEN/PREDICT cell
    ('predict_fuel_type', 'string'),  # fuel column marked PREDICT, else null
]

# --- Curated zone (ym_datalake.etl.real_compute output) ---------------------

# fact_ship_daily body columns — ship_id is the partition key (projection), so
# it is omitted here. Grain: one row per ship per vt_fd row, with the fitted
# expected speed / ISO-style speed loss and maintenance clocks.
FACT_SHIP_DAILY_COLUMNS = [
    ('noon_utc', 'int'),
    ('speed_through_water', 'double'),
    ('avg_speed', 'double'),
    ('me_avg_rpm', 'double'),
    ('horse_power', 'double'),
    ('sfoc', 'double'),
    ('me_slip', 'double'),
    ('total_consump', 'double'),
    ('me_consumption', 'double'),
    ('hours_full_speed', 'double'),
    ('wind_scale', 'double'),
    ('v_expected_kn', 'double'),  # clean-hull expected speed at measured power
    ('speed_loss_pct', 'double'),  # (v_expected - STW) / v_expected * 100
    ('days_since_cleaning', 'int'),  # resets on UWC / UWC+PP / DD
    ('days_since_polish', 'int'),  # resets on PP / UWI+PP / UWC+PP / DD
    ('valid_flag', 'boolean'),  # steady-state gate (hours, wind, bounds, unmasked)
    ('masked_flag', 'boolean'),
]

FACT_SHIP_ANOMALY_COLUMNS = [
    ('ship_id', 'string'),
    ('noon_utc', 'int'),
    ('metric', 'string'),  # speed_loss_pct / sfoc / me_slip / total_consump
    ('value', 'double'),
    ('z_score', 'double'),  # robust z (median/MAD, floored scale)
    ('severity', 'string'),  # low / medium / high
]

FACT_SHIP_ALERT_COLUMNS = [
    ('alert_id', 'string'),  # AL-<ship>-<metric>-<opened_day>
    ('ship_id', 'string'),
    ('metric', 'string'),
    ('opened_day', 'int'),
    ('last_seen_day', 'int'),
    ('n_days', 'int'),
    ('peak_value', 'double'),
    ('peak_z', 'double'),
    ('severity', 'string'),
    ('status', 'string'),  # open / closed
    ('message', 'string'),
]

FACT_SHIP_MAINTENANCE_RECOMMENDATION_COLUMNS = [
    ('ship_id', 'string'),
    ('action_type', 'string'),  # hull_cleaning / propeller_polishing / engine_inspection
    ('priority', 'string'),  # high / medium / low
    ('due_day', 'int'),  # relative day, same axis as noon_utc
    ('current_value', 'double'),
    ('threshold_value', 'double'),
    ('rate_per_day', 'double'),
    ('trigger_eta_day', 'int'),
    ('rationale', 'string'),
]

# maintenance columns — flat table, ship_id stays a body column (77 rows).
MAINTENANCE_COLUMNS = [
    ('ship_id', 'string'),
    ('event_type', 'string'),  # PP / UWI+PP / UWC / UWC+PP / DD / UWI
    ('event_day', 'int'),  # relative day, same axis as vt_fd.noon_utc
    ('propeller_condition', 'string'),  # Good / Fair / Poor
    ('hull_fouling_type', 'string'),  # comma list: barnacle/slime/algae/tubeworm/calcium
    ('hull_coating_condition', 'string'),  # Good / Fair / Poor
    ('cavitation_found', 'string'),  # Yes / No
    ('draft_fwd_m', 'double'),
    ('draft_aft_m', 'double'),
]
