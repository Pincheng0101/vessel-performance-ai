"""Glue catalog: the 20 tables of the ym_hackathon data lake, as (name, type) lists.

Every table is **flat and unpartitioned** — 21,282 noon rows / ~4 MB is far below
the size where partition pruning pays for itself, so ``ship_id`` is an ordinary
body column everywhere and each table is one JSONL file.

Two zones:

* **raw** (6) — ``noon_report`` / ``vessel_master`` / ``maintenance_event`` are the
  three real source files, landed *verbatim*: every row, every column, unmutated.
  ``reference_curve`` / ``uwi`` / ``fuel_price`` are derived or synthesized, and
  carry no preservation duty.
* **curated** (14) — every mutation (dedupe, outlier clipping, displacement
  backfill) and every derivation (ISO 15016/19030, CII, geography, economics)
  happens here.

**Provenance.** Column comments tag each field:

* ``measured``  — read from the source data (reproducible from vt_fd/vessel/maintenance)
* ``class``     — a W1/W2 sister-ship design value, identical across the fleet
* ``estimated`` — synthesized; an assumption, **never quote as fact**

The synthesized set is: the calendar epoch, all geography (lat/lon/heading/ports),
all USD, the UWI numeric signals, and event cost/downtime/location.
"""

# S1-S12 training ships, S21-S23 prediction ships (masked windows).
SHIP_IDS = [f'S{i}' for i in range(1, 13)] + ['S21', 'S22', 'S23']

# ---------------------------------------------------------------------------
# Raw zone (6)
# ---------------------------------------------------------------------------

# 1. noon_report — VERBATIM dataset/vt_fd.csv. 21,282 rows (incl. the 344 duplicate
# (ship_id, noon_utc) rows), all 40 source columns, unmutated. The only additions are
# the two loader markers, which *preserve* the information the HIDDEN/PREDICT -> null
# conversion would otherwise destroy. Grain: ship x noon report (NOT unique on
# (ship_id, noon_utc) — the curated zone is where duplicates collapse).
NOON_REPORT_COLUMNS = [
    ('ship_id', 'string'),  # measured: 'De-identification Name'
    ('voyage', 'string'),  # measured: voyage no; unique only within a ship
    ('noon_utc', 'int'),  # measured: relative day; day 0 = the ship's earliest record
    ('avg_speed', 'double'),  # measured: SOG, kn
    ('speed_through_water', 'double'),  # measured: STW, kn
    ('me_avg_rpm', 'double'),  # measured
    ('propeller_speed', 'double'),  # measured: RPM
    ('fore_draft', 'double'),  # measured: m
    ('after_draft', 'double'),  # measured: m
    ('displacement', 'double'),  # measured: MT (68.5% fill)
    ('cargo_on_board', 'double'),  # measured: MT
    ('wind_scale', 'double'),  # measured: Beaufort
    ('sea_height', 'double'),  # measured: m
    ('sea_water_temp', 'double'),  # measured: deg C
    ('wind_speed', 'double'),  # measured: kn
    ('wind_direction', 'double'),  # measured: 16-point compass (0-15), NOT degrees
    ('swell_height', 'double'),  # measured: m
    ('swell_direction', 'double'),  # measured: 16-point compass (0-15)
    ('sea_direction', 'double'),  # measured: 16-point compass (0-15)
    ('water_depth', 'double'),  # measured: m (shallow-water gate)
    ('mid_draft', 'double'),  # measured: m
    ('total_distance', 'double'),  # measured: nm over ground
    ('sea_speed_distance', 'double'),  # measured: nm through water, full-speed hours
    ('diff_stw_sog_slip', 'double'),  # measured: STW-SOG delta (current proxy)
    ('full_spd_stw_slip', 'double'),  # measured: %
    ('horse_power', 'double'),  # measured: kW (H-class)
    ('load_pct', 'double'),  # measured: %MCR (H-class)
    ('sfoc', 'double'),  # measured: g/kWh (H-class)
    ('me_slip', 'double'),  # measured: % (H-class)
    ('thrust', 'double'),  # measured: kN (H-class)
    ('thrust_quotient', 'double'),  # measured: - (H-class)
    ('total_consump', 'double'),  # measured: MT/day incl. aux/boiler (T-class)
    ('me_consumption', 'double'),  # measured: MT/day (T-class)
    ('me_fullspeed_consump_hshfo', 'double'),  # measured: MT/day (T-class)
    ('me_fullspeed_consump_ulsfo', 'double'),  # measured: MT/day (T-class)
    ('me_fullspeed_consump_vlsfo', 'double'),  # measured: MT/day (T-class)
    ('me_fullspeed_consump_lsmgo', 'double'),  # measured: MT/day (T-class)
    ('me_fullspeed_consump_bio_hsfo', 'double'),  # measured: MT/day (T-class)
    ('hours_full_speed', 'double'),  # measured: hr
    ('hours_total', 'double'),  # measured: hr
    ('masked_flag', 'boolean'),  # measured: row had any HIDDEN/PREDICT cell (S21-S23 only)
    ('predict_fuel_type', 'string'),  # measured: the column marked PREDICT, else null
]

# 2. vessel_master — VERBATIM dataset/vessel.jsonl. 15 rows x 32 columns, unmutated.
# Particulars reverse-engineered from vt_fd; see doc/vessel.md for the derivations.
VESSEL_MASTER_COLUMNS = [
    ('imo_number', 'string'),  # estimated: SYNTHETIC (9800001-9800015), not a real IMO
    ('ship_id', 'string'),  # measured: joins noon_report.ship_id
    ('hull_class', 'string'),  # class: W1 / W2 (the two sister-ship groups)
    ('role', 'string'),  # measured: train (S1-S12) / predict (S21-S23)
    ('vessel_type', 'string'),  # class: container
    ('teu_nominal', 'int'),  # class
    ('loa_m', 'double'),  # class
    ('lpp_m', 'double'),  # class
    ('breadth_m', 'double'),  # class
    ('design_draft_m', 'double'),  # class
    ('scantling_draft_m', 'double'),  # class
    ('displacement_design_t', 'double'),  # measured: displacement-draft fit over vt_fd
    ('displacement_scantling_t', 'double'),  # measured: same fit, at scantling draft
    ('cb_design', 'double'),  # measured
    ('cb_scantling', 'double'),  # measured
    ('cw', 'double'),  # measured: waterplane coefficient
    ('tpc_t_per_cm', 'double'),  # measured: tonnes-per-cm (drives the displacement backfill)
    ('dwt', 'double'),  # estimated: scantling displacement minus estimated lightship
    ('gross_tonnage', 'double'),  # class
    ('lightship_t', 'double'),  # estimated: NOT derivable from the data
    ('mcr_kw', 'double'),  # measured: calm-water power curve at design speed
    ('ncr_kw', 'double'),  # measured: ~85% MCR
    ('mcr_rpm', 'double'),  # measured: upper envelope of me_avg_rpm
    ('design_speed_kn', 'double'),  # measured: STW at the knee of the calm-water curve
    ('propeller_type', 'string'),  # class: FPP
    ('propeller_variant', 'string'),  # measured: P1 (pitch 9.886 m) / P2 (9.556 m)
    ('n_blades', 'int'),  # class
    ('diameter_m', 'double'),  # class
    ('pitch_m', 'double'),  # measured: propeller_speed * 1852 / (60 * me_avg_rpm), median
    ('pitch_diameter_ratio', 'double'),  # measured
    ('transverse_area_m2', 'double'),  # estimated: windage area, NOT derivable from the data
    ('build_year', 'int'),  # estimated: NOT derivable from the data
]

# 3. maintenance_event — dataset/maintenance.csv, split on '+' into ATOMIC events:
# 77 source rows -> 115 rows (UWI+PP -> UWI, PP; UWC+PP -> UWC, PP). Every source
# column is replicated onto each atom and `source_event_type` carries the original
# composite verbatim, so grouping on (ship_id, event_day) reconstructs the 77 source
# rows exactly. Atomic types mean the reset clocks fall straight out of `event_type`:
# UWC -> hull, PP -> propeller, DD -> both, UWI -> neither (inspection only).
MAINTENANCE_EVENT_COLUMNS = [
    ('ship_id', 'string'),  # measured
    ('event_type', 'string'),  # measured (atomised): PP / UWC / UWI / DD
    ('event_day', 'int'),  # measured: relative day, same axis as noon_report.noon_utc
    ('propeller_condition', 'string'),  # measured: Good / Fair / Poor (45/77 rows populated)
    ('hull_fouling_type', 'string'),  # measured: comma list barnacle/slime/algae/tubeworm/calcium
    ('hull_coating_condition', 'string'),  # measured: Good / Fair / Poor (26/77 rows populated)
    ('cavitation_found', 'string'),  # measured: Yes / No (36/77 rows populated)
    ('draft_fwd_m', 'double'),  # measured
    ('draft_aft_m', 'double'),  # measured
    ('source_event_type', 'string'),  # measured: the original composite (e.g. 'UWC+PP')
]

# 4. reference_curve — FITTED from noon_report clean-window points. Grain: ship x speed
# point (15 ships x 12 points spanning 0.5-1.05 x design speed).
#
# The clean-hull curve P = a * V^n * (disp/disp_ref)^(2/3) is what every ISO 19030 number
# keys off, so `curve_a` / `curve_n` are carried on every row rather than hidden in code.
# The fit is PARTIALLY POOLED, which is the whole point:
#   * `curve_n` (the speed exponent) is shared across sister ships — it is a property of
#     the hull form, and one ship's ~26 clean points cannot determine it, while a pool of
#     9 ships' 231 points can.
#   * `curve_a` (the scale) is fitted PER SHIP — sister ships are not identical, and a
#     pooled scale bakes each ship's own baseline efficiency into its speed loss as a
#     constant offset. That offset is what makes a cleaning event look like it made the
#     hull *worse*.
REFERENCE_CURVE_COLUMNS = [
    ('ref_curve_id', 'string'),  # RC-<ship_id>
    ('ship_id', 'string'),  # measured
    ('hull_class', 'string'),  # class
    ('propeller_variant', 'string'),  # measured
    ('speed_kn', 'double'),  # the speed point
    ('shaft_power_kw', 'double'),  # measured (fitted): clean-hull power at speed_kn, disp_ref
    ('displacement_ref_t', 'double'),  # class: the displacement the curve is fitted at
    ('curve_a', 'double'),  # measured (fitted): PER SHIP scale
    ('curve_n', 'double'),  # measured (fitted): POOLED speed exponent, on per-speed-bin medians
    ('curve_n_clamped', 'boolean'),  # true if CURVE_N_BOUNDS bound: curve_n is a rail, not a fit
    ('fit_pool', 'string'),  # the pool the exponent came from: '<class>-<variant>', or
    # '<class>' when the variant pool was too thin (S22 is the only W2-P1 ship, and a masked
    # prediction ship at that, so its pool widens to the W2 hull class)
    ('n_fit_points', 'int'),  # measured: this ship's own clean-window valid points
    ('n_pool_points', 'int'),  # measured: the points behind the pooled exponent
    ('fit_rmse_pct', 'double'),  # measured: log-space RMSE of the fit, as % of power
]

# 5. uwi — the inspection projection: the 43 UWI atoms (12 standalone + 31 from
# UWI+PP) plus the 10 DD rows (a dry-dock inspects). The grades are REAL (sparse:
# coating 26/77, propeller 45/77, cavitation 36/77 source rows); the four numeric
# signals are ESTIMATED — synthesized conditioned on the real grade AND the real
# measured speed loss on the inspection day, so the rating<->speed-loss relationship
# holds against real data rather than noise. Never quote them as fact.
UWI_COLUMNS = [
    ('inspection_id', 'string'),  # UWI-<ship>-<day>
    ('ship_id', 'string'),  # measured
    ('inspection_day', 'int'),  # measured: relative day
    ('inspection_type', 'string'),  # measured: UWI (in-water) / DD (dry-dock)
    ('hull_fouling_rating', 'int'),  # estimated: 0-100, higher = more fouled
    ('hull_fouling_coverage_pct', 'double'),  # estimated: % of hull area fouled
    ('hull_fouling_type', 'string'),  # measured: comma list, verbatim from maintenance
    ('propeller_condition', 'string'),  # measured: REAL Good/Fair/Poor scale (not Rubert A-F)
    ('propeller_roughness_um', 'double'),  # estimated: conditioned on propeller_condition
    ('hull_coating_condition', 'string'),  # measured: Good / Fair / Poor
    ('coating_breakdown_pct', 'double'),  # estimated: conditioned on hull_coating_condition
    ('cavitation_found', 'string'),  # measured: Yes / No
    ('recommended_action', 'string'),  # none / polish / clean
]

# 6. fuel_price — synthesized daily random walk on the SHARED RELATIVE-DAY axis
# (no calendar in raw), for the 5 real fuels the dataset actually uses. Entirely
# ESTIMATED: every USD figure downstream inherits this.
FUEL_PRICE_COLUMNS = [
    ('day', 'int'),  # relative day, same axis as noon_report.noon_utc
    ('fuel_type', 'string'),  # HSHFO / ULSFO / VLSFO / LSMGO / BIO_HSFO
    ('price_usd_per_mt', 'double'),  # estimated: bunker price (USD/t)
]

# ---------------------------------------------------------------------------
# Curated zone (14)
# ---------------------------------------------------------------------------

# 7. fact_performance_daily — the analytical spine. Grain: ship x day, UNIQUE (the
# 344 raw duplicates collapse here). ISO/derived columns are null when the day is
# not steady enough to invert the curve (no power, no STW, clipped outliers).
FACT_PERFORMANCE_DAILY_COLUMNS = [
    ('ship_id', 'string'),  # measured
    ('noon_utc', 'int'),  # measured: relative day (the join key)
    ('report_date', 'string'),  # estimated: YYYY-MM-DD, epoch day 0 = 2021-07-01
    ('year', 'int'),  # estimated: calendar year (needed for the CII required line)
    ('month', 'int'),  # estimated: calendar month
    ('voyage', 'string'),  # measured
    ('hull_class', 'string'),  # class
    ('fleet_id', 'string'),  # class: FL-W1 / FL-W2 (fleet == hull class)
    ('latitude', 'double'),  # estimated: geography, draped along the voyage rotation
    ('longitude', 'double'),  # estimated: geography
    ('heading_deg', 'double'),  # estimated: bearing along the synthesized route
    ('port_from', 'string'),  # estimated: the rotation's origin LOCODE
    ('port_to', 'string'),  # estimated: the rotation's destination LOCODE
    ('speed_through_water', 'double'),  # measured: STW, kn
    ('avg_speed', 'double'),  # measured: SOG, kn
    ('me_avg_rpm', 'double'),  # measured
    ('horse_power', 'double'),  # measured (clipped): kW
    ('displacement', 'double'),  # measured, or backfilled from draft (see displacement_source)
    ('displacement_source', 'string'),  # measured / backfilled
    ('mean_draft_m', 'double'),  # measured: (fore + after) / 2
    ('cargo_on_board', 'double'),  # measured: MT
    ('hours_full_speed', 'double'),  # measured: hr
    ('hours_total', 'double'),  # measured (clipped to 24): hr
    ('total_distance', 'double'),  # measured: nm
    ('wind_scale', 'double'),  # measured: Beaufort
    ('wind_speed', 'double'),  # measured: kn
    ('sea_height', 'double'),  # measured: m
    ('resistance_wind_kn', 'double'),  # ISO 15016: Blendermann wind added resistance (kN)
    ('resistance_wave_kn', 'double'),  # ISO 15016: STAWAVE-1 wave added resistance (kN)
    ('power_corrected_kw', 'double'),  # ISO 15016: horse_power - wind/wave power
    ('speed_corrected_kn', 'double'),  # ISO 15016: STW (current is already excluded)
    ('v_expected_kn', 'double'),  # ISO 19030: clean-hull speed at the corrected power
    ('speed_loss_pct', 'double'),  # ISO 19030: (v_expected - STW) / v_expected * 100
    ('slip_apparent', 'double'),  # (V_th - SOG) / V_th
    ('slip_real', 'double'),  # (V_th - STW) / V_th
    ('sfoc_g_kwh', 'double'),  # measured: source SFOC (clipped)
    ('admiralty_coef', 'double'),  # disp^(2/3) * STW^3 / power
    ('eeoi', 'double'),  # gCO2 / t.nm; null on ballast / zero-cargo days
    ('fuel_type', 'string'),  # measured: the day's ME fuel (from the me_fullspeed_consump_* columns)
    ('total_foc_mt', 'double'),  # measured: total_consump
    ('me_foc_mt', 'double'),  # measured: me_consumption
    ('co2_mt', 'double'),  # total_foc_mt * carbon factor
    ('excess_foc_mt', 'double'),  # fuel wasted to fouling: me_foc * [1 - (1-s)^n]
    ('excess_cost_usd', 'double'),  # estimated (USD): excess_foc * fuel price
    ('cum_excess_cost_usd', 'double'),  # estimated (USD): running sum within the fouling cycle
    ('excess_cost_fouling_usd', 'double'),  # estimated (USD): = excess_cost_usd
    ('excess_cost_weather_usd', 'double'),  # estimated (USD): wind+wave channel
    ('excess_cost_operational_usd', 'double'),  # estimated (USD): off-design engine-load channel
    ('cii_aer', 'double'),  # annual AER attained (gCO2/dwt.nm), broadcast onto each day
    ('cii_rating_aer', 'string'),  # A-E vs the base reference line
    ('cii_imo', 'double'),  # annual IMO attained (= AER for container ships)
    ('cii_rating_imo', 'string'),  # A-E vs the year's reduced required line
    ('days_since_cleaning', 'int'),  # resets on UWC / DD
    ('days_since_polish', 'int'),  # resets on PP / DD
    ('days_since_dry_dock', 'int'),  # resets on DD
    ('anomaly_flag', 'boolean'),  # filled from fact_anomaly
    ('anomaly_cause', 'string'),  # filled from fact_anomaly
    ('anomaly_severity', 'string'),  # filled from fact_anomaly
    ('valid_flag', 'boolean'),  # ISO 19030 gate (>=22h full speed, Bft <=4, deep water, ...)
    ('masked_flag', 'boolean'),  # measured: S21-S23 masked window
]

# 8. fact_performance_indicator — ISO 19030 period indicators, long format.
# 5 ships (S9-S12, S23) have no DD at all, so they get no DDP rows.
FACT_PERFORMANCE_INDICATOR_COLUMNS = [
    ('ship_id', 'string'),
    ('indicator', 'string'),  # ISP / DDP / ME / MT
    ('period_start_day', 'int'),  # ISP: cycle start
    ('period_end_day', 'int'),  # ISP: cycle end; DDP: event_day + 45
    ('event_type', 'string'),  # ME, DDP: the event the row is keyed to
    ('event_day', 'int'),  # ME, DDP, MT: event / crossing day
    ('value', 'double'),  # per indicator (see doc)
    ('reference_value', 'double'),  # per indicator (see doc)
    ('detail', 'string'),  # free-text
]

# 9. fact_uwi — the raw uwi projection + the calendar and the day's real speed loss.
FACT_UWI_COLUMNS = [
    ('ship_id', 'string'),
    ('inspection_id', 'string'),
    ('inspection_day', 'int'),  # measured
    ('inspection_date', 'string'),  # estimated: calendar
    ('inspection_type', 'string'),  # measured: UWI / DD
    ('hull_fouling_rating', 'int'),  # estimated
    ('hull_fouling_coverage_pct', 'double'),  # estimated
    ('hull_fouling_type', 'string'),  # measured
    ('propeller_condition', 'string'),  # measured: Good / Fair / Poor
    ('propeller_roughness_um', 'double'),  # estimated
    ('hull_coating_condition', 'string'),  # measured
    ('coating_breakdown_pct', 'double'),  # estimated
    ('cavitation_found', 'string'),  # measured
    ('recommended_action', 'string'),
    ('speed_loss_pct', 'double'),  # measured: the 14-day trailing ISO 19030 speed loss at inspection
]

# 10. fact_maintenance_event — the 115 atoms + synthesized economics + the M3 effect
# columns. `source_event_type` still reconstructs the 77 source rows.
FACT_MAINTENANCE_EVENT_COLUMNS = [
    ('ship_id', 'string'),
    ('event_id', 'string'),  # MV-<ship>-<day>-<type>
    ('event_day', 'int'),  # measured
    ('event_date', 'string'),  # estimated: calendar
    ('event_type', 'string'),  # measured (atomised): PP / UWC / UWI / DD
    ('source_event_type', 'string'),  # measured: the original composite
    ('propeller_condition', 'string'),  # measured
    ('hull_coating_condition', 'string'),  # measured
    ('hull_fouling_type', 'string'),  # measured
    ('cavitation_found', 'string'),  # measured
    ('draft_fwd_m', 'double'),  # measured
    ('draft_aft_m', 'double'),  # measured
    ('cost_usd', 'double'),  # estimated: per-type cost model
    ('downtime_hours', 'double'),  # estimated
    ('location', 'string'),  # estimated: the port nearest the synthesized track that day
    ('me_recovery_pct', 'double'),  # (before - after) / before * 100 from the ME indicator
    ('payback_days', 'double'),  # estimated (USD-derived): full cost / daily excess-cost saving
]

# 11. dim_vessel — vessel_master + the curated joins (fleet, curve FK, dry-dock clock).
DIM_VESSEL_COLUMNS = VESSEL_MASTER_COLUMNS + [
    ('fleet_id', 'string'),  # class: FL-W1 / FL-W2
    ('fleet_name', 'string'),  # class: W1 Class / W2 Class
    ('ref_curve_id', 'string'),  # FK -> dim_reference_curve.ref_curve_id
    ('last_dry_dock_day', 'int'),  # measured: latest DD event_day; null for S9-S12, S23
    ('last_dry_dock_date', 'string'),  # estimated: calendar
]

# 12. dim_reference_curve — pass-through of raw reference_curve.
DIM_REFERENCE_CURVE_COLUMNS = list(REFERENCE_CURVE_COLUMNS)

# 13. dim_port — the 10 LOCODEs the synthesized geography draws from. Entirely
# ESTIMATED as far as this fleet is concerned: real ports, but no real call at them.
DIM_PORT_COLUMNS = [
    ('locode', 'string'),
    ('name', 'string'),
    ('lat', 'double'),
    ('lon', 'double'),
    ('is_eu', 'boolean'),
]

# 14. agg_fleet_daily — grain: (fleet, day). fleet_id 'ALL' is the whole-fleet rollup;
# ALWAYS filter fleet_id or every query double-counts the rollup against its fleets.
AGG_FLEET_DAILY_COLUMNS = [
    ('fleet_id', 'string'),  # ALL / FL-W1 / FL-W2
    ('noon_utc', 'int'),  # measured: relative day
    ('report_date', 'string'),  # estimated: calendar
    ('year', 'int'),  # estimated
    ('month', 'int'),  # estimated
    ('n_vessels', 'int'),
    ('n_speed_loss_ships', 'int'),  # ships passing the ISO gate; < MIN_SPEED_LOSS_SHIPS => avg is null
    ('avg_speed_loss_pct', 'double'),  # mean of valid daily speed_loss_pct
    ('total_excess_cost_usd', 'double'),  # estimated (USD)
    ('cii_count_a', 'int'),  # ships at each cii_rating_imo (the regulatory grade) that day
    ('cii_count_b', 'int'),
    ('cii_count_c', 'int'),
    ('cii_count_d', 'int'),
    ('cii_count_e', 'int'),
    ('n_alerts', 'int'),
]

# 15. fact_voyage — grain: (ship_id, voyage). A voyage here is a real multi-month
# ROTATION (median 71 days / ~19,000 nm), not a port-to-port leg, so the geography
# step drapes a multi-leg port rotation over it; from_port/to_port are its endpoints.
# Distance / FOC / CO2 SUM the real daily values, so the energy balance is exact.
FACT_VOYAGE_COLUMNS = [
    ('ship_id', 'string'),
    ('voyage_no', 'string'),  # measured
    ('hull_class', 'string'),  # class
    ('from_port', 'string'),  # estimated: rotation origin LOCODE
    ('to_port', 'string'),  # estimated: rotation destination LOCODE
    ('depart_day', 'int'),  # measured: min noon_utc of the group
    ('arrive_day', 'int'),  # measured: max noon_utc of the group
    ('depart_date', 'string'),  # estimated: calendar
    ('arrive_date', 'string'),  # estimated: calendar
    ('distance_nm', 'double'),  # measured: sum of the real daily total_distance
    ('sea_days', 'int'),  # measured: rows in the voyage
    ('avg_speed_kn', 'double'),  # measured: distance_nm / sum(hours_total)
    ('total_foc_mt', 'double'),  # measured: sum of the real daily total_consump (energy balance)
    ('fuel_cost_usd', 'double'),  # estimated (USD): each day priced by its own fuel
    ('co2_mt', 'double'),  # sum of the daily co2_mt
    ('avg_speed_loss_pct', 'double'),  # mean of the valid daily speed_loss_pct
    ('usd_per_nm', 'double'),  # estimated (USD)
    ('on_time_flag', 'boolean'),  # estimated: actual days <= planned days
    ('planned_days', 'int'),  # estimated: real distance_nm / the class's MEDIAN REALISED speed
    # (W1 9.79 kn, W2 10.33 kn) — the only schedule this dataset carries. Not a design figure.
]

# 16. fact_anomaly — one row per flagged (ship, day) at the driver metric.
FACT_ANOMALY_COLUMNS = [
    ('ship_id', 'string'),
    ('noon_utc', 'int'),
    ('report_date', 'string'),  # estimated: calendar
    ('metric', 'string'),  # speed_loss / slip / sfoc / excess_foc
    ('value', 'double'),
    ('z_score', 'double'),  # robust (median/MAD) z
    ('severity', 'string'),  # low / medium / high
    ('cause', 'string'),  # engine_degradation / propeller / weather / sensor
]

# 17. fact_alert — one row per alert episode. Biofouling is a *trend* cause here and
# is deliberately never a fact_anomaly point cause.
FACT_ALERT_COLUMNS = [
    ('ship_id', 'string'),
    ('alert_id', 'string'),  # AL-<ship>-<opened_day>-<cause>
    ('fleet_id', 'string'),
    ('opened_day', 'int'),
    ('last_seen_day', 'int'),
    ('opened_date', 'string'),  # estimated: calendar
    ('last_seen_date', 'string'),  # estimated: calendar
    ('cause', 'string'),  # hull_biofouling / propeller / engine_degradation / weather / sensor
    ('severity', 'string'),  # low / medium / high
    ('driver_metric', 'string'),  # speed_loss / slip / sfoc / excess_foc
    ('peak_value', 'double'),
    ('peak_z', 'double'),  # null for biofouling (a trend, not a z)
    ('excess_cost_usd', 'double'),  # estimated (USD)
    ('recommended_action', 'string'),
    ('status', 'string'),  # open / closed
    ('source', 'string'),  # anomaly / fouling_model
    ('message_zh', 'string'),
    ('message_en', 'string'),
]

# 18. fact_recommendation — one row per ship: the closed-form optimal hull-cleaning
# interval. c(t) = alpha + beta*t; J(T) = K/T + alpha + beta*T/2; T* = sqrt(2K/beta).
FACT_RECOMMENDATION_COLUMNS = [
    ('ship_id', 'string'),
    ('last_cleaning_day', 'int'),  # measured: latest UWC/DD reset
    ('recommended_clean_day', 'int'),  # last_cleaning_day + round(T*)
    ('recommended_clean_date', 'string'),  # estimated: calendar
    ('trigger_eta_day', 'int'),  # day the open cycle reaches the 8% speed-loss trigger
    ('t_star_days', 'double'),  # estimated (USD-derived): T* = sqrt(2K/beta)
    ('fouling_rate_pct_per_day', 'double'),  # measured: open-cycle speed-loss slope
    ('net_saving_usd', 'double'),  # estimated (USD)
    ('status', 'string'),  # ok / insufficient_history
]

# 19. fact_maintenance_recommendation — one row per (ship, due action). A ship with
# nothing due has no rows.
FACT_MAINTENANCE_RECOMMENDATION_COLUMNS = [
    ('ship_id', 'string'),
    ('action_type', 'string'),  # hull_cleaning / propeller_polishing / propeller_repair /
    # coating_renewal / engine_inspection
    ('priority', 'string'),  # high / medium / low
    ('due_day', 'int'),  # forecast threshold crossing, bounded to the priority window
    ('due_date', 'string'),  # estimated: calendar
    ('rationale', 'string'),
    ('source', 'string'),  # uwi / anomaly / fouling_model / sfoc_trend / uwi+anomaly
    ('degradation_rate', 'double'),  # Theil-Sen slope of the action's signal (per day)
    ('degradation_unit', 'string'),  # %/day or um/day
    ('current_value', 'double'),
    ('threshold_value', 'double'),  # 8 (hull) / 300, 430 (propeller um) / 45 (coating %) / 5 (engine %)
    ('trigger_eta_day', 'int'),
    ('t_star_days', 'double'),  # estimated (USD-derived); economic actions only
    ('net_saving_usd', 'double'),  # estimated (USD); economic actions only
    ('plan_day', 'int'),  # the batched service window this action folds into
    ('plan_date', 'string'),  # estimated: calendar
    ('plan_service_type', 'string'),  # dry_dock / in_water
]

# 20. fact_speed_profile — 24 speed-grid points per ship. usd_per_nm is convex only
# because of the per-day charter cost; drop it and the argmin degenerates to the
# slowest grid point.
FACT_SPEED_PROFILE_COLUMNS = [
    ('ship_id', 'string'),
    ('speed_kn', 'double'),  # 24 points, 0.5 - 1.0 x design speed
    ('shaft_power_kw', 'double'),  # clean-hull power from the reference curve
    ('foc_mt_per_day', 'double'),  # fouling-inflated daily burn at the latest speed loss
    ('co2_mt_per_day', 'double'),
    ('fuel_usd_per_day', 'double'),  # estimated (USD)
    ('charter_usd_per_day', 'double'),  # estimated (USD): the time cost; not a measured particular
    ('usd_per_day', 'double'),  # estimated (USD)
    ('usd_per_nm', 'double'),  # estimated (USD): convex; its argmin is the economical speed
    ('fuel_usd_per_nm', 'double'),  # estimated (USD): fuel-only, strictly increasing
    ('recommended_speed_kn', 'double'),  # the usd_per_nm argmin (repeated on all 24 rows)
    ('current_speed_kn', 'double'),  # latest valid STW (repeated)
    ('annual_distance_nm', 'double'),  # measured: annualised sum of total_distance (repeated)
]

# ---------------------------------------------------------------------------
# The catalog: table name -> column list. The CDK stack registers exactly these.
# ---------------------------------------------------------------------------

RAW_TABLES: dict[str, list[tuple[str, str]]] = {
    'noon_report': NOON_REPORT_COLUMNS,
    'vessel_master': VESSEL_MASTER_COLUMNS,
    'maintenance_event': MAINTENANCE_EVENT_COLUMNS,
    'reference_curve': REFERENCE_CURVE_COLUMNS,
    'uwi': UWI_COLUMNS,
    'fuel_price': FUEL_PRICE_COLUMNS,
}

CURATED_TABLES: dict[str, list[tuple[str, str]]] = {
    'fact_performance_daily': FACT_PERFORMANCE_DAILY_COLUMNS,
    'fact_performance_indicator': FACT_PERFORMANCE_INDICATOR_COLUMNS,
    'fact_uwi': FACT_UWI_COLUMNS,
    'fact_maintenance_event': FACT_MAINTENANCE_EVENT_COLUMNS,
    'dim_vessel': DIM_VESSEL_COLUMNS,
    'dim_reference_curve': DIM_REFERENCE_CURVE_COLUMNS,
    'dim_port': DIM_PORT_COLUMNS,
    'agg_fleet_daily': AGG_FLEET_DAILY_COLUMNS,
    'fact_voyage': FACT_VOYAGE_COLUMNS,
    'fact_anomaly': FACT_ANOMALY_COLUMNS,
    'fact_alert': FACT_ALERT_COLUMNS,
    'fact_recommendation': FACT_RECOMMENDATION_COLUMNS,
    'fact_maintenance_recommendation': FACT_MAINTENANCE_RECOMMENDATION_COLUMNS,
    'fact_speed_profile': FACT_SPEED_PROFILE_COLUMNS,
}

ALL_TABLES: dict[str, list[tuple[str, str]]] = RAW_TABLES | CURATED_TABLES
