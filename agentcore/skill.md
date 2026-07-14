# `ym_hackathon` — GenBI SQL Guide

Write Athena SQL against the YangMing vessel-performance data lake and run it with the
**`athena_query`** tool.

## Tool contract

- Pass **one** `SELECT` (or `WITH … SELECT`) statement as `query`. No DDL, no DML, no
  multiple statements.
- The database (`ym_hackathon`), workgroup and catalog are **pre-configured on the tool** —
  reference tables by **bare name** (`fact_performance_daily`, never
  `ym_hackathon.fact_performance_daily`).
- Aggregate in SQL. Keep result sets small: `LIMIT` ≤ 100 rows unless the user asks for more.
- Query only tables and columns listed below. If the lake cannot answer the question, say so —
  never invent data.

## Catalog coordinates

**20 tables**, all in one Glue database: **6 raw** (source files, landed verbatim, plus three
synthesized inputs) and **14 curated** (dedupe, outlier clipping, ISO 15016/19030, CII,
geography, economics).

| | |
|---|---|
| Format | **JSONL** — one JSON object per line |
| SerDe | `org.openx.data.jsonserde.JsonSerDe` |
| **Partitions** | **none — on any table** |

**Nothing in this lake is partitioned.** The whole lake is ~4 MB, far below the size where
partition pruning pays for its own complexity. `ship_id` is an **ordinary body column**
everywhere. **Never write a partition predicate** — there is nothing to prune. (Filter
`ship_id` when the question is about one ship, of course; just don't treat it as a partition
key, and don't add one "for pruning" when the question is fleet-wide.)

A consequence of the JSON SerDe: **temporal columns are stored as `string`**, not `DATE`. Cast
them when you need date arithmetic — `CAST(report_date AS DATE)`, `date_trunc('month',
CAST(report_date AS DATE))`.

## Timeline

Everything shares one **relative-day integer axis**, day 0 … 1825 (~5 years):

- `noon_report.noon_utc`, `fact_performance_daily.noon_utc`, `agg_fleet_daily.noon_utc`
- `maintenance_event.event_day`, `fact_maintenance_event.event_day`
- `uwi.inspection_day`, `fact_uwi.inspection_day`
- `fuel_price.day`

The **raw zone has no calendar at all** — answer time questions on raw tables in relative days.

The **curated zone adds one** (`report_date`, `event_date`, `inspection_date`, `due_date`, …):
`YYYY-MM-DD`, with **epoch day 0 = 2021-07-01** — but that epoch is **`(est.)`**, an assumption,
not a fact from the source. Use it for readable axes; don't build a claim on the specific dates.

## Fleet

**15 container ships**, ~1,180–1,500 noon reports each (21,282 raw rows):

`S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11 S12 S21 S22 S23` — no S13–S20.

- `role = 'train'` → **S1–S12**. `role = 'predict'` → **S21–S23** (the masked ships).
- `hull_class` is `W1` / `W2` — two sister-ship groups.
- `fleet_id` is `FL-W1` / `FL-W2`. **Fleet == hull class**; there is no other fleet dimension.
- S9 stops at day 1464; the rest run to ~day 1825.

## Traps

Each one of these is a *wrong answer*, not a style nit.

1. **`agg_fleet_daily` carries an `'ALL'` rollup row** alongside `FL-W1` / `FL-W2`. **Always
   filter `fleet_id`** (`= 'ALL'` *or* `IN ('FL-W1','FL-W2')`) — omit it and every aggregate
   double-counts the rollup against the fleets it already contains.

2. **`fact_performance_daily.valid_flag` is the ISO 19030 gate** (≥22 h full speed, Beaufort ≤ 4,
   deep water, steady load). Any speed-loss / hull-condition / fouling-trend work **must filter
   `valid_flag`** — without it you are plotting weather, not hull.

3. **`masked_flag`** marks the hackathon-masked rows (S21–S23 only): their fuel-consumption value
   was blanked. **Exclude them from consumption statistics** (`WHERE NOT masked_flag`).
   `predict_fuel_type` holds **the target column's name, UPPERCASE — not a fuel code**. The only two
   values in the data are `ME_FULLSPEED_CONSUMP_HSHFO` (91 rows) and `ME_FULLSPEED_CONSUMP_VLSFO`
   (11 rows) — **102 PREDICT cells**. Filter on the full name; `= 'HSHFO'` matches **nothing**. The
   column it names is lowercase (`me_fullspeed_consump_hshfo`), so lower-case the value before you
   use it as an identifier.

4. **Raw `noon_report` is landed verbatim** — including **344 duplicate `(ship_id, noon_utc)`
   rows** and raw speed outliers (up to 97.8 kn). For analytics prefer curated
   **`fact_performance_daily`** (deduped, clipped, displacement-backfilled, unique on
   `(ship_id, noon_utc)`). Use `noon_report` for the **prediction task** and for
   provenance/"what does the source actually say" questions.

5. **`hull_fouling_type` is a comma list** with inconsistent order and spacing
   (`barnacle,slime,algae`, `slime, calcium`). Match with `LIKE '%barnacle%'` — **never `=`**.

6. **Provenance — estimated ≠ fact.** Synthesized, not measured: **the calendar epoch, all
   geography** (lat/lon/heading/ports/LOCODEs), **all USD** (fuel price and everything downstream
   of it — excess cost, payback, net saving, charter), **`imo_number`**, **the UWI numeric
   signals** (fouling rating/coverage, propeller roughness, coating breakdown), and **event
   cost / downtime / location**. They are tagged `(est.)` in the dictionary below. Present them
   as *modelled* figures; never quote them as fact.

7. **`days_since_cleaning` / `days_since_polish` / `days_since_dry_dock` are columns** on
   `fact_performance_daily` (resets: `UWC`/`DD` · `PP`/`DD` · `DD`). Use them. Do **not**
   hand-roll a `max(event_day) <= noon_utc` join.

8. **`cause = 'weather'` is unreachable — on `fact_anomaly` *and* `fact_alert`.** The rule needs
   `wind_scale ≥ 5`, but anomalies are only scored on `valid_flag` rows, which the ISO gate caps at
   Beaufort ≤ 4. Alerts are raised from anomalies (plus the biofouling model), so a cause that never
   fires on an anomaly can never reach an alert either. It is in both enums; it appears in neither
   table. Don't offer it as a finding.

---

# Column dictionary

`(est.)` in a note = **estimated / synthesized** — see trap 6.

## Raw zone (6 tables)

### `noon_report`

The real source noon-report CSV, landed **verbatim**: every row (including the 344
duplicates), every column, unmutated. The two loader markers (`masked_flag`,
`predict_fuel_type`) are the only additions — they preserve what the HIDDEN/PREDICT → null
conversion would otherwise destroy.

**Grain:** ship × noon report — **NOT unique** on `(ship_id, noon_utc)` · **Rows:** 21,282 ·
**Columns:** 42

| column | type | note |
|---|---|---|
| `ship_id` | string | the de-identified ship name (`S1`…`S23`) |
| `voyage` | string | voyage no; unique only within a ship |
| `noon_utc` | int | relative day; day 0 = the ship's earliest record |
| `avg_speed` | double | SOG, kn |
| `speed_through_water` | double | STW, kn |
| `me_avg_rpm` | double | main-engine RPM |
| `propeller_speed` | double | RPM |
| `fore_draft` | double | m |
| `after_draft` | double | m |
| `displacement` | double | MT (only 68.5% filled — the curated zone backfills it) |
| `cargo_on_board` | double | MT |
| `wind_scale` | double | Beaufort |
| `sea_height` | double | m |
| `sea_water_temp` | double | deg C |
| `wind_speed` | double | kn |
| `wind_direction` | double | 16-point compass (0–15), **NOT degrees** |
| `swell_height` | double | m |
| `swell_direction` | double | 16-point compass (0–15) |
| `sea_direction` | double | 16-point compass (0–15) |
| `water_depth` | double | m (the shallow-water gate) |
| `mid_draft` | double | m |
| `total_distance` | double | nm over ground |
| `sea_speed_distance` | double | nm through water, full-speed hours |
| `diff_stw_sog_slip` | double | STW−SOG delta (current proxy) |
| `full_spd_stw_slip` | double | % |
| `horse_power` | double | kW |
| `load_pct` | double | %MCR |
| `sfoc` | double | g/kWh; null on ~20% of rows |
| `me_slip` | double | % |
| `thrust` | double | kN |
| `thrust_quotient` | double | — |
| `total_consump` | double | MT/day incl. aux/boiler |
| `me_consumption` | double | MT/day |
| `me_fullspeed_consump_hshfo` | double | MT/day |
| `me_fullspeed_consump_ulsfo` | double | MT/day |
| `me_fullspeed_consump_vlsfo` | double | MT/day |
| `me_fullspeed_consump_lsmgo` | double | MT/day |
| `me_fullspeed_consump_bio_hsfo` | double | MT/day |
| `hours_full_speed` | double | hr |
| `hours_total` | double | hr |
| `masked_flag` | boolean | row had a HIDDEN/PREDICT cell (S21–S23 only) |
| `predict_fuel_type` | string | the column marked PREDICT, else null — **the target** |

### `vessel_master`

`vessel.jsonl`, verbatim. Hull particulars reverse-engineered from the noon reports.

**Grain:** ship · **Rows:** 15 · **Columns:** 32

| column | type | note |
|---|---|---|
| `imo_number` | string | **(est.)** SYNTHETIC (9800001–9800015) — not a real IMO |
| `ship_id` | string | joins `noon_report.ship_id` |
| `hull_class` | string | W1 / W2 (the two sister-ship groups) |
| `role` | string | `train` (S1–S12) / `predict` (S21–S23) |
| `vessel_type` | string | container |
| `teu_nominal` | int | — |
| `loa_m` | double | — |
| `lpp_m` | double | — |
| `breadth_m` | double | — |
| `design_draft_m` | double | — |
| `scantling_draft_m` | double | — |
| `displacement_design_t` | double | displacement–draft fit over the noon reports |
| `displacement_scantling_t` | double | same fit, at scantling draft |
| `cb_design` | double | block coefficient |
| `cb_scantling` | double | — |
| `cw` | double | waterplane coefficient |
| `tpc_t_per_cm` | double | tonnes-per-cm (drives the displacement backfill) |
| `dwt` | double | **(est.)** scantling displacement minus estimated lightship |
| `gross_tonnage` | double | — |
| `lightship_t` | double | **(est.)** NOT derivable from the data |
| `mcr_kw` | double | calm-water power curve at design speed |
| `ncr_kw` | double | ~85% MCR |
| `mcr_rpm` | double | upper envelope of `me_avg_rpm` |
| `design_speed_kn` | double | STW at the knee of the calm-water curve |
| `propeller_type` | string | FPP |
| `propeller_variant` | string | P1 (pitch 9.886 m) / P2 (9.556 m) |
| `n_blades` | int | — |
| `diameter_m` | double | — |
| `pitch_m` | double | median of `propeller_speed * 1852 / (60 * me_avg_rpm)` |
| `pitch_diameter_ratio` | double | — |
| `transverse_area_m2` | double | **(est.)** windage area, NOT derivable from the data |
| `build_year` | int | **(est.)** NOT derivable from the data |

### `maintenance_event`

`maintenance.csv` split on `+` into **atoms**: 77 source rows → 115. Grouping on
`(ship_id, event_day)` reconstructs the 77 source rows exactly.

**Grain:** ship × atomic event · **Rows:** 115 · **Columns:** 10

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `event_type` | string | atomised: `PP` / `UWC` / `UWI` / `DD` |
| `event_day` | int | relative day, same axis as `noon_report.noon_utc` |
| `propeller_condition` | string | Good / Fair / Poor (45 of 77 source rows populated) |
| `hull_fouling_type` | string | comma list — match with `LIKE`, see trap 5 |
| `hull_coating_condition` | string | Good / Fair (26 of 77 populated) |
| `cavitation_found` | string | Yes / No (36 of 77 populated) |
| `draft_fwd_m` | double | — |
| `draft_aft_m` | double | — |
| `source_event_type` | string | the original composite, e.g. `UWC+PP` |

### `reference_curve`

The clean-hull curve `P = a·V^n·(Δ/Δ_ref)^⅔`, **fitted** from clean-window valid noon points.
Every ISO 19030 number in the lake keys off `curve_a` / `curve_n`. Partially pooled: `curve_n`
is shared across sister ships, `curve_a` is per ship.

**Grain:** ship × speed point (15 × 12) · **Rows:** 180 · **Columns:** 14

| column | type | note |
|---|---|---|
| `ref_curve_id` | string | `RC-<ship_id>` |
| `ship_id` | string | — |
| `hull_class` | string | — |
| `propeller_variant` | string | — |
| `speed_kn` | double | the speed point |
| `shaft_power_kw` | double | fitted clean-hull power at `speed_kn`, at `displacement_ref_t` |
| `displacement_ref_t` | double | the displacement the curve is fitted at |
| `curve_a` | double | fitted — **per ship** scale |
| `curve_n` | double | fitted — **pooled** speed exponent, a slope over per-speed-bin medians (W1 2.76, W2 2.57-2.59) |
| `curve_n_clamped` | boolean | true ⇒ `curve_n` hit the bounds and is a rail, not a fit. False on every row today |
| `fit_pool` | string | the pool the exponent came from: `<class>-<variant>`, or `<class>` when the variant pool was too thin |
| `n_fit_points` | int | this ship's own clean-window valid points |
| `n_pool_points` | int | the points behind the pooled exponent |
| `fit_rmse_pct` | double | log-space RMSE of the fit, as % of power |

### `uwi`

The inspection projection: **real grades, estimated numbers**. The four numeric signals are
synthesized, conditioned on the real grade and the real speed loss measured that day.

**Grain:** inspection (43 UWI atoms + 10 DD) · **Rows:** 53 · **Columns:** 13

| column | type | note |
|---|---|---|
| `inspection_id` | string | `UWI-<ship>-<day>` |
| `ship_id` | string | — |
| `inspection_day` | int | relative day |
| `inspection_type` | string | `UWI` (in-water) / `DD` (dry-dock) |
| `hull_fouling_rating` | int | **(est.)** 0–100, higher = more fouled |
| `hull_fouling_coverage_pct` | double | **(est.)** % of hull area fouled |
| `hull_fouling_type` | string | comma list, verbatim from `maintenance_event` |
| `propeller_condition` | string | REAL Good / Fair / Poor scale |
| `propeller_roughness_um` | double | **(est.)** conditioned on `propeller_condition` |
| `hull_coating_condition` | string | Good / Fair |
| `coating_breakdown_pct` | double | **(est.)** conditioned on `hull_coating_condition` |
| `cavitation_found` | string | Yes / No |
| `recommended_action` | string | none / polish / clean |

### `fuel_price`

The synthesized bunker series. **Entirely estimated** — every USD figure in the lake descends
from this table.

**Grain:** day × fuel (1,826 × 5) · **Rows:** 9,130 · **Columns:** 3

| column | type | note |
|---|---|---|
| `day` | int | relative day, same axis as `noon_report.noon_utc` |
| `fuel_type` | string | HSHFO / ULSFO / VLSFO / LSMGO / BIO_HSFO |
| `price_usd_per_mt` | double | **(est.)** bunker price, USD/t |

---

## Curated zone (14 tables)

### `fact_performance_daily`

**The analytical spine — start here for almost any fleet-performance question.** Every other
curated table reads it. One row per day the ship reported, including days that fail the ISO
gate; **`valid_flag` says which may be fitted on** (trap 2).

**Grain:** ship × day — **unique** · **Rows:** 20,938 · **Columns:** 60

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `noon_utc` | int | relative day (the join key) |
| `report_date` | string | **(est.)** `YYYY-MM-DD`, epoch day 0 = 2021-07-01; cast for date maths |
| `year` | int | **(est.)** calendar year (the CII required line needs it) |
| `month` | int | **(est.)** calendar month |
| `voyage` | string | — |
| `hull_class` | string | W1 / W2 |
| `fleet_id` | string | FL-W1 / FL-W2 (fleet == hull class) |
| `latitude` | double | **(est.)** geography, draped along the voyage rotation |
| `longitude` | double | **(est.)** geography |
| `heading_deg` | double | **(est.)** bearing along the synthesized route |
| `port_from` | string | **(est.)** the rotation's origin LOCODE |
| `port_to` | string | **(est.)** the rotation's destination LOCODE |
| `speed_through_water` | double | STW, kn |
| `avg_speed` | double | SOG, kn |
| `me_avg_rpm` | double | — |
| `horse_power` | double | kW (outlier-clipped) |
| `displacement` | double | measured, or backfilled from draft — see `displacement_source` |
| `displacement_source` | string | `measured` / `backfilled` |
| `mean_draft_m` | double | (fore + after) / 2 |
| `cargo_on_board` | double | MT |
| `hours_full_speed` | double | hr |
| `hours_total` | double | hr (clipped to 24) |
| `total_distance` | double | nm |
| `wind_scale` | double | Beaufort |
| `wind_speed` | double | kn |
| `sea_height` | double | m |
| `resistance_wind_kn` | double | ISO 15016: Blendermann wind added resistance (kN) |
| `resistance_wave_kn` | double | ISO 15016: STAWAVE-1 wave added resistance (kN) |
| `power_corrected_kw` | double | ISO 15016: `horse_power` minus wind/wave power |
| `speed_corrected_kn` | double | ISO 15016: STW (current is already excluded) |
| `v_expected_kn` | double | ISO 19030: clean-hull speed at the corrected power |
| `speed_loss_pct` | double | **ISO 19030: `(v_expected − STW) / v_expected * 100`** — the headline hull metric |
| `slip_apparent` | double | `(V_th − SOG) / V_th` |
| `slip_real` | double | `(V_th − STW) / V_th` |
| `sfoc_g_kwh` | double | source SFOC (clipped) |
| `admiralty_coef` | double | `disp^(2/3) * STW^3 / power` |
| `eeoi` | double | gCO2 / t·nm; null on ballast / zero-cargo days |
| `fuel_type` | string | the day's ME fuel |
| `total_foc_mt` | double | total fuel oil consumption |
| `me_foc_mt` | double | main-engine FOC |
| `co2_mt` | double | `total_foc_mt` × carbon factor |
| `excess_foc_mt` | double | fuel wasted to fouling: `me_foc * [1 − (1−s)^n]` |
| `excess_cost_usd` | double | **(est.)** `excess_foc` × fuel price |
| `cum_excess_cost_usd` | double | **(est.)** running sum within the fouling cycle |
| `excess_cost_fouling_usd` | double | **(est.)** = `excess_cost_usd` |
| `excess_cost_weather_usd` | double | **(est.)** the wind+wave channel |
| `excess_cost_operational_usd` | double | **(est.)** the off-design engine-load channel |
| `cii_aer` | double | annual AER attained (gCO2/dwt·nm), broadcast onto each day |
| `cii_rating_aer` | string | A–E vs the base reference line |
| `cii_imo` | double | annual IMO attained (= AER for container ships) |
| `cii_rating_imo` | string | A–E vs the year's reduced required line |
| `days_since_cleaning` | int | resets on UWC / DD — **use this, don't hand-roll it** |
| `days_since_polish` | int | resets on PP / DD |
| `days_since_dry_dock` | int | resets on DD |
| `anomaly_flag` | boolean | filled from `fact_anomaly` |
| `anomaly_cause` | string | filled from `fact_anomaly` |
| `anomaly_severity` | string | filled from `fact_anomaly` |
| `valid_flag` | boolean | **the ISO 19030 gate** (≥22 h full speed, Bft ≤ 4, deep water, …) |
| `masked_flag` | boolean | S21–S23 masked window — exclude from consumption stats |

### `fact_performance_indicator`

The four ISO 19030 period indicators, long format. **`value` / `reference_value` mean different
things per `indicator`** — see the enum section. 5 ships (S9–S12, S23) never dry-docked, so they
have no `DDP` rows.

**Grain:** ship × indicator × period/event · **Rows:** 87 · **Columns:** 9

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `indicator` | string | `ISP` / `DDP` / `ME` / `MT` |
| `period_start_day` | int | ISP: cycle start |
| `period_end_day` | int | ISP: cycle end; DDP: `event_day` + 45 |
| `event_type` | string | ME, DDP: the event the row is keyed to |
| `event_day` | int | ME, DDP, MT: event / crossing day |
| `value` | double | **per indicator** — see the enum section |
| `reference_value` | double | **per indicator** — see the enum section |
| `detail` | string | free text |

### `fact_uwi`

The `uwi` projection + the calendar + the real 14-day trailing speed loss measured at the
inspection. This is where you correlate a **real grade** against a **real** ISO 19030 number.

**Grain:** inspection · **Rows:** 53 · **Columns:** 15

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `inspection_id` | string | — |
| `inspection_day` | int | relative day |
| `inspection_date` | string | **(est.)** calendar |
| `inspection_type` | string | `UWI` / `DD` |
| `hull_fouling_rating` | int | **(est.)** 0–100 |
| `hull_fouling_coverage_pct` | double | **(est.)** % of hull area |
| `hull_fouling_type` | string | comma list — `LIKE`, not `=` |
| `propeller_condition` | string | Good / Fair / Poor |
| `propeller_roughness_um` | double | **(est.)** — |
| `hull_coating_condition` | string | Good / Fair |
| `coating_breakdown_pct` | double | **(est.)** — |
| `cavitation_found` | string | Yes / No |
| `recommended_action` | string | none / polish / clean |
| `speed_loss_pct` | double | the **real** 14-day trailing ISO 19030 speed loss at inspection |

### `fact_maintenance_event`

The 115 atoms + estimated economics + **the maintenance-effect columns**. `me_recovery_pct`
answers "did the cleaning work?" directly — no before/after window join needed.

**Grain:** ship × atomic event · **Rows:** 115 · **Columns:** 17

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `event_id` | string | `MV-<ship>-<day>-<type>` |
| `event_day` | int | relative day |
| `event_date` | string | **(est.)** calendar |
| `event_type` | string | atomised: `PP` / `UWC` / `UWI` / `DD` |
| `source_event_type` | string | the original composite |
| `propeller_condition` | string | — |
| `hull_coating_condition` | string | — |
| `hull_fouling_type` | string | comma list — `LIKE`, not `=` |
| `cavitation_found` | string | — |
| `draft_fwd_m` | double | — |
| `draft_aft_m` | double | — |
| `cost_usd` | double | **(est.)** per-type cost model |
| `downtime_hours` | double | **(est.)** — |
| `location` | string | **(est.)** the port nearest the synthesized track that day |
| `me_recovery_pct` | double | **speed loss recovered at the event**: `(before − after) / before * 100`; positive = the hull recovered |
| `payback_days` | double | **(est.)** cost / daily excess-cost saving |

### `dim_vessel`

`vessel_master` + the curated joins: fleet, reference-curve FK, dry-dock clock.
**`last_dry_dock_*` is null for S9–S12 and S23** — they never dry-docked.

**Grain:** ship · **Rows:** 15 · **Columns:** 37

| column | type | note |
|---|---|---|
| `imo_number` | string | **(est.)** SYNTHETIC — not a real IMO |
| `ship_id` | string | joins `noon_report.ship_id` |
| `hull_class` | string | W1 / W2 |
| `role` | string | `train` (S1–S12) / `predict` (S21–S23) |
| `vessel_type` | string | container |
| `teu_nominal` | int | — |
| `loa_m` | double | — |
| `lpp_m` | double | — |
| `breadth_m` | double | — |
| `design_draft_m` | double | — |
| `scantling_draft_m` | double | — |
| `displacement_design_t` | double | — |
| `displacement_scantling_t` | double | — |
| `cb_design` | double | — |
| `cb_scantling` | double | — |
| `cw` | double | waterplane coefficient |
| `tpc_t_per_cm` | double | tonnes-per-cm |
| `dwt` | double | **(est.)** — |
| `gross_tonnage` | double | — |
| `lightship_t` | double | **(est.)** — |
| `mcr_kw` | double | — |
| `ncr_kw` | double | ~85% MCR |
| `mcr_rpm` | double | — |
| `design_speed_kn` | double | — |
| `propeller_type` | string | FPP |
| `propeller_variant` | string | P1 / P2 |
| `n_blades` | int | — |
| `diameter_m` | double | — |
| `pitch_m` | double | — |
| `pitch_diameter_ratio` | double | — |
| `transverse_area_m2` | double | **(est.)** — |
| `build_year` | int | **(est.)** — |
| `fleet_id` | string | FL-W1 / FL-W2 |
| `fleet_name` | string | `W1 Class` / `W2 Class` |
| `ref_curve_id` | string | FK → `dim_reference_curve.ref_curve_id` |
| `last_dry_dock_day` | int | latest DD `event_day`; **null for S9–S12, S23** |
| `last_dry_dock_date` | string | **(est.)** calendar |

### `dim_reference_curve`

Pass-through of raw `reference_curve` (identical columns). Check `n_fit_points` before you trust
a ship's speed loss.

**Grain:** ship × speed point · **Rows:** 180 · **Columns:** 14

| column | type | note |
|---|---|---|
| `ref_curve_id` | string | `RC-<ship_id>` |
| `ship_id` | string | — |
| `hull_class` | string | — |
| `propeller_variant` | string | — |
| `speed_kn` | double | the speed point |
| `shaft_power_kw` | double | fitted clean-hull power at `speed_kn` |
| `displacement_ref_t` | double | the displacement the curve is fitted at |
| `curve_a` | double | fitted — per ship |
| `curve_n` | double | fitted — pooled, over per-speed-bin medians |
| `curve_n_clamped` | boolean | true ⇒ a rail, not a fit. False everywhere today |
| `fit_pool` | string | `<class>-<variant>`, or `<class>` when the variant pool was too thin |
| `n_fit_points` | int | **below 8 ⇒ the ship borrowed its pool's scale** (S6, S8, S21, S22) |
| `n_pool_points` | int | — |
| `fit_rmse_pct` | double | log-space RMSE, as % of power |

### `dim_port`

The 10 LOCODEs the synthesized geography draws from. Real ports, real coordinates — but
**this fleet never actually called at them**. Treat every port/geography answer as modelled.

**Grain:** port · **Rows:** 10 · **Columns:** 5

| column | type | note |
|---|---|---|
| `locode` | string | UN/LOCODE |
| `name` | string | port name |
| `lat` | double | — |
| `lon` | double | — |
| `is_eu` | boolean | EU MRV scope |

### `agg_fleet_daily`

⚠️ **Carries a `fleet_id = 'ALL'` rollup row** alongside `FL-W1` / `FL-W2`. **Always filter
`fleet_id`** (trap 1).

**Grain:** fleet × day (1,826 × 3) · **Rows:** 5,478 · **Columns:** 14

| column | type | note |
|---|---|---|
| `fleet_id` | string | `ALL` / `FL-W1` / `FL-W2` — **never omit this filter** |
| `noon_utc` | int | relative day |
| `report_date` | string | **(est.)** calendar |
| `year` | int | **(est.)** — |
| `month` | int | **(est.)** — |
| `n_vessels` | int | ships reporting that day |
| `avg_speed_loss_pct` | double | mean of the **valid** daily `speed_loss_pct` |
| `total_excess_cost_usd` | double | **(est.)** — |
| `cii_count_a` | int | ships rated A that day |
| `cii_count_b` | int | — |
| `cii_count_c` | int | — |
| `cii_count_d` | int | — |
| `cii_count_e` | int | — |
| `n_alerts` | int | open alerts that day |

### `fact_voyage`

A voyage here is a multi-month **rotation** (median ~71 days / ~19,000 nm), not a port-to-port
leg. `distance_nm` / `total_foc_mt` / `co2_mt` are plain sums of the real dailies, so the energy
balance is exact by construction.

**Grain:** ship × voyage · **Rows:** 300 · **Columns:** 19

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `voyage_no` | string | joins `fact_performance_daily.voyage` |
| `hull_class` | string | — |
| `from_port` | string | **(est.)** rotation origin LOCODE |
| `to_port` | string | **(est.)** rotation destination LOCODE |
| `depart_day` | int | min `noon_utc` of the group |
| `arrive_day` | int | max `noon_utc` of the group |
| `depart_date` | string | **(est.)** calendar |
| `arrive_date` | string | **(est.)** calendar |
| `distance_nm` | double | sum of the real daily `total_distance` |
| `sea_days` | int | rows in the voyage |
| `avg_speed_kn` | double | `distance_nm / sum(hours_total)` |
| `total_foc_mt` | double | sum of the real daily consumption |
| `fuel_cost_usd` | double | **(est.)** each day priced by its own fuel |
| `co2_mt` | double | sum of the daily `co2_mt` |
| `avg_speed_loss_pct` | double | mean of the **valid** daily `speed_loss_pct` |
| `usd_per_nm` | double | **(est.)** — |
| `on_time_flag` | boolean | **(est.)** actual days ≤ planned days — i.e. did this voyage keep pace with its class |
| `planned_days` | int | **(est.)** real `distance_nm` / the class's **median realised** voyage speed (W1 9.79 kn, W2 10.33 kn) |

### `fact_anomaly`

One row per flagged (ship, day), at the driver metric. **Biofouling is never a cause here** — it
is a trend, not a point event (it surfaces in `fact_alert`). `cause = 'weather'` never fires
(trap 8).

**Grain:** ship × flagged day · **Rows:** 369 · **Columns:** 8

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `noon_utc` | int | relative day |
| `report_date` | string | **(est.)** calendar |
| `metric` | string | `speed_loss` / `slip` / `sfoc` / `excess_foc` |
| `value` | double | the metric's value that day |
| `z_score` | double | robust (median/MAD) z |
| `severity` | string | low / medium / high |
| `cause` | string | `engine_degradation` / `propeller` / `sensor` (never `weather`) |

### `fact_alert`

The narration layer. Runs no new detection: it collapses anomaly days into episodes and adds the
biofouling trend. Bilingual messages — `message_zh` is ready-made Traditional Chinese.

**Grain:** alert episode · **Rows:** 222 · **Columns:** 18

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `alert_id` | string | `AL-<ship>-<opened_day>-<cause>` |
| `fleet_id` | string | FL-W1 / FL-W2 |
| `opened_day` | int | relative day |
| `last_seen_day` | int | relative day |
| `opened_date` | string | **(est.)** calendar |
| `last_seen_date` | string | **(est.)** calendar |
| `cause` | string | `hull_biofouling` / `propeller` / `engine_degradation` / `sensor` (never `weather` — trap 8) |
| `severity` | string | low / medium / high |
| `driver_metric` | string | `speed_loss` / `slip` / `sfoc` / `excess_foc` |
| `peak_value` | double | — |
| `peak_z` | double | null for biofouling (a trend, not a z) |
| `excess_cost_usd` | double | **(est.)** — |
| `recommended_action` | string | — |
| `status` | string | open / closed |
| `source` | string | `anomaly` / `fouling_model` |
| `message_zh` | string | Traditional Chinese narration |
| `message_en` | string | English narration |

### `fact_recommendation`

The closed-form optimal hull-cleaning interval, `T* = √(2K/β)`. One row per ship; 5 are
`insufficient_history`.

**Grain:** ship · **Rows:** 15 · **Columns:** 9

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `last_cleaning_day` | int | latest UWC/DD reset |
| `recommended_clean_day` | int | `last_cleaning_day + round(T*)` |
| `recommended_clean_date` | string | **(est.)** calendar |
| `trigger_eta_day` | int | day the open cycle reaches the 8% speed-loss trigger |
| `t_star_days` | double | **(est.)** `T* = sqrt(2K/beta)` |
| `fouling_rate_pct_per_day` | double | open-cycle speed-loss slope (real) |
| `net_saving_usd` | double | **(est.)** — |
| `status` | string | `ok` / `insufficient_history` (check it before quoting) |

### `fact_maintenance_recommendation`

Every action a ship actually needs, batched into shared service windows. **A ship with nothing
due has no rows** — absence is the answer, not a bug.

**Grain:** ship × due action · **Rows:** 20 · **Columns:** 17

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `action_type` | string | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| `priority` | string | high / medium / low |
| `due_day` | int | forecast threshold crossing, bounded to the priority window |
| `due_date` | string | **(est.)** calendar |
| `rationale` | string | why this action is due |
| `source` | string | `uwi` / `anomaly` / `fouling_model` / `sfoc_trend` / `uwi+anomaly` |
| `degradation_rate` | double | Theil–Sen slope of the action's signal (per day) |
| `degradation_unit` | string | `%/day` or `um/day` |
| `current_value` | double | — |
| `threshold_value` | double | 8 (hull %) / 300, 430 (propeller um) / 45 (coating %) / 5 (engine %) |
| `trigger_eta_day` | int | — |
| `t_star_days` | double | **(est.)** economic actions only |
| `net_saving_usd` | double | **(est.)** economic actions only |
| `plan_day` | int | the batched service window this action folds into |
| `plan_date` | string | **(est.)** calendar |
| `plan_service_type` | string | `dry_dock` / `in_water` |

### `fact_speed_profile`

The slow-steaming economics. `usd_per_nm` is convex **only** because of the per-day charter
cost; drop it and the argmin degenerates to the slowest grid point.

**Grain:** ship × speed-grid point (15 × 24) · **Rows:** 360 · **Columns:** 13

| column | type | note |
|---|---|---|
| `ship_id` | string | — |
| `speed_kn` | double | 24 points, 0.5 – 1.0 × design speed |
| `shaft_power_kw` | double | clean-hull power from the reference curve |
| `foc_mt_per_day` | double | fouling-inflated daily burn at the latest speed loss |
| `co2_mt_per_day` | double | — |
| `fuel_usd_per_day` | double | **(est.)** — |
| `charter_usd_per_day` | double | **(est.)** the time cost; not a measured particular |
| `usd_per_day` | double | **(est.)** — |
| `usd_per_nm` | double | **(est.)** convex; its argmin is the economical speed |
| `fuel_usd_per_nm` | double | **(est.)** fuel-only, strictly increasing |
| `recommended_speed_kn` | double | the `usd_per_nm` argmin (repeated on all 24 rows) |
| `current_speed_kn` | double | latest valid STW (repeated) |
| `annual_distance_nm` | double | annualised sum of `total_distance` (repeated) |

---

# Enum reference

| Column | Values |
|---|---|
| `event_type` (atomic) | `PP` polish · `UWC` hull clean · `UWI` inspect · `DD` dry dock |
| `source_event_type` | `PP` · `UWI` · `UWC` · `DD` · `UWI+PP` · `UWC+PP` (the 6 source composites) |
| `propeller_condition` | `Good` · `Fair` · `Poor` |
| `hull_coating_condition` | `Good` · `Fair` — **`Poor` never occurs in the source** |
| `hull_fouling_type` | comma list of `barnacle` · `slime` · `algae` · `tubeworm` · `calcium` (inconsistent order/spacing — parse as a set, match with `LIKE`) |
| `cavitation_found` | `Yes` · `No` |
| `recommended_action` (uwi) | `none` · `polish` · `clean` |
| `fuel_type` | `HSHFO` · `ULSFO` · `VLSFO` · `LSMGO` · `BIO_HSFO` |
| `fleet_id` | `FL-W1` · `FL-W2` · **`ALL`** (the rollup — always filter!) |
| `hull_class` | `W1` · `W2` |
| `propeller_variant` | `P1` (pitch 9.886 m) · `P2` (9.556 m) |
| `role` | `train` (S1–S12) · `predict` (S21–S23) |
| `displacement_source` | `measured` · `backfilled` |
| `cii_rating_aer`, `cii_rating_imo` | `A` · `B` · `C` · `D` · `E` |
| `indicator` | `ISP` · `DDP` · `ME` · `MT` |
| `metric` (anomaly/alert) | `speed_loss` · `slip` · `sfoc` · `excess_foc` |
| `cause` (anomaly) | `engine_degradation` · `propeller` · `sensor` · `weather` (**never fires** — trap 8) |
| `cause` (alert) | the above + `hull_biofouling` |
| `severity` | `low` · `medium` · `high` |
| `status` (alert) | `open` · `closed` |
| `source` (alert) | `anomaly` · `fouling_model` |
| `action_type` | `hull_cleaning` · `propeller_polishing` · `propeller_repair` · `coating_renewal` · `engine_inspection` |
| `plan_service_type` | `dry_dock` · `in_water` |
| `status` (recommendation) | `ok` · `insufficient_history` |
| `predict_fuel_type` | the PREDICT target column name, e.g. `ME_FULLSPEED_CONSUMP_HSHFO` / `ME_FULLSPEED_CONSUMP_VLSFO` |

**On `indicator`** — `value` and `reference_value` mean different things per code:

| Code | `value` | `reference_value` |
|---|---|---|
| `ISP` | this cleaning cycle's mean speed loss | the **first** cycle's mean |
| `DDP` | mean speed loss in the 45 d **after** the dry dock | mean in the 45 d **before** |
| `ME` | `before − after` (positive = the hull recovered) | `before` |
| `MT` | `8.0` (the trigger) | null |

---

# Worked queries

```sql
-- Speed-loss trend for one ship, ISO-valid points only.
-- valid_flag is the gate: without it you are plotting weather, not hull condition.
SELECT report_date, speed_loss_pct, days_since_cleaning
FROM   fact_performance_daily
WHERE  ship_id = 'S4' AND valid_flag AND speed_loss_pct IS NOT NULL
ORDER  BY noon_utc
LIMIT  100
```

```sql
-- Fleet speed loss over time. NOTE the fleet_id filter — without it the 'ALL'
-- rollup row is summed alongside the two sub-fleets it already contains.
SELECT report_date, avg_speed_loss_pct, n_vessels
FROM   agg_fleet_daily
WHERE  fleet_id = 'ALL'            -- or 'FL-W1' / 'FL-W2'; never omit
ORDER  BY noon_utc
LIMIT  100
```

```sql
-- Did the hull cleanings actually work, and did they pay back?
-- me_recovery_pct = the speed loss recovered at the event. No window join needed.
SELECT ship_id, event_day, event_type, me_recovery_pct, cost_usd, payback_days
FROM   fact_maintenance_event
WHERE  event_type IN ('UWC', 'DD') AND me_recovery_pct IS NOT NULL
ORDER  BY me_recovery_pct DESC
LIMIT  100
```

```sql
-- The 102 PREDICT cells: the hackathon's actual deliverable. predict_fuel_type is the
-- UPPERCASE name of the target column, not a fuel code (trap 3).
SELECT ship_id, noon_utc, predict_fuel_type
FROM   noon_report
WHERE  predict_fuel_type IS NOT NULL
ORDER  BY ship_id, noon_utc       -- 102 rows: 91 ME_FULLSPEED_CONSUMP_HSHFO + 11 ..._VLSFO
LIMIT  200                        -- must exceed 102: LIMIT 100 silently drops the tail
```

```sql
-- Speed-power scatter against the fitted clean-hull curve, for one ship.
SELECT d.speed_through_water, d.power_corrected_kw, c.speed_kn, c.shaft_power_kw
FROM   fact_performance_daily d
JOIN   dim_reference_curve c ON c.ship_id = d.ship_id
WHERE  d.ship_id = 'S4' AND d.valid_flag
LIMIT  100
```

```sql
-- Check a ship's curve before you trust its speed loss: n_fit_points below 8
-- means the ship borrowed its pool's scale (S6, S8, S21, S22 do).
SELECT DISTINCT ship_id, fit_pool, curve_a, curve_n, n_fit_points, fit_rmse_pct
FROM   dim_reference_curve
ORDER  BY n_fit_points
LIMIT  100
```

```sql
-- The economical speed, per ship (repeated on all 24 grid rows).
SELECT DISTINCT ship_id, recommended_speed_kn, current_speed_kn
FROM   fact_speed_profile
ORDER  BY ship_id
LIMIT  100
```

```sql
-- Resolve the fleet: who exists, which class/fleet, how much data, when they last dry-docked.
SELECT v.ship_id, v.hull_class, v.fleet_id, v.role, v.design_speed_kn,
       v.last_dry_dock_day, COUNT(d.noon_utc) AS n_days,
       MIN(d.noon_utc) AS first_day, MAX(d.noon_utc) AS last_day
FROM   dim_vessel v
LEFT JOIN fact_performance_daily d ON d.ship_id = v.ship_id
GROUP  BY v.ship_id, v.hull_class, v.fleet_id, v.role, v.design_speed_kn, v.last_dry_dock_day
ORDER  BY v.ship_id
LIMIT  100
```

```sql
-- Maintenance history of one ship, with what the inspection found.
SELECT event_day, event_date, event_type, source_event_type, propeller_condition,
       hull_fouling_type, hull_coating_condition, cavitation_found, cost_usd
FROM   fact_maintenance_event
WHERE  ship_id = 'S1'
ORDER  BY event_day
LIMIT  100
```

```sql
-- Fouling growth: how speed loss climbs with days since the last hull cleaning.
SELECT days_since_cleaning / 30 AS months_since_cleaning,
       ROUND(AVG(speed_loss_pct), 2) AS avg_speed_loss_pct,
       COUNT(*) AS n_days
FROM   fact_performance_daily
WHERE  ship_id = 'S4' AND valid_flag AND speed_loss_pct IS NOT NULL
GROUP  BY 1
ORDER  BY 1
LIMIT  100
```

```sql
-- Fuel mix and burn per ship (masked rows excluded — their consumption is blanked).
SELECT ship_id, fuel_type,
       ROUND(SUM(total_foc_mt), 0) AS total_foc_mt,
       ROUND(SUM(co2_mt), 0)       AS co2_mt,
       COUNT(*)                    AS n_days
FROM   fact_performance_daily
WHERE  NOT masked_flag AND fuel_type IS NOT NULL
GROUP  BY ship_id, fuel_type
ORDER  BY ship_id, total_foc_mt DESC
LIMIT  100
```

```sql
-- What is due, and when: the batched maintenance plan.
SELECT ship_id, action_type, priority, due_day, due_date, plan_day, plan_service_type,
       current_value, threshold_value, net_saving_usd, rationale
FROM   fact_maintenance_recommendation
ORDER  BY priority, due_day
LIMIT  100
```

```sql
-- Open alerts, worst first (message_zh is ready-made Traditional Chinese).
SELECT ship_id, alert_id, cause, severity, driver_metric, peak_value,
       excess_cost_usd, opened_date, message_zh
FROM   fact_alert
WHERE  status = 'open'
ORDER  BY severity, excess_cost_usd DESC
LIMIT  100
```

```sql
-- Does the (estimated) fouling rating actually track the (real) speed loss?
SELECT hull_fouling_rating, propeller_condition, hull_coating_condition,
       ROUND(speed_loss_pct, 2) AS speed_loss_pct, hull_fouling_type
FROM   fact_uwi
WHERE  speed_loss_pct IS NOT NULL AND hull_fouling_type LIKE '%barnacle%'
ORDER  BY hull_fouling_rating DESC
LIMIT  100
```
