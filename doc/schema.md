# Schema — the 20-table data dictionary

Every column of every table in the `ym_hackathon` Glue catalog, rendered from
[`ym_datalake/schema.py`](../ym_datalake/schema.py) — which is the source of truth. If this
document and that file disagree, the file is right and this document is a bug.

- [`dataset.md`](dataset.md) — what the source files contain
- [`curated-dataset.md`](curated-dataset.md) — how the curated tables are computed
- [`synthetic-dataset.md`](synthetic-dataset.md) — which columns are estimated, and how

---

## Catalog coordinates

Identical for all 20 tables. There are no exceptions and no special cases.

| | |
|---|---|
| Glue database | `ym_hackathon` |
| Athena workgroup | `ym-hackathon-workgroup` (dev) |
| Table type | `EXTERNAL_TABLE` |
| Format | **JSONL** — one JSON object per line |
| SerDe | `org.openx.data.jsonserde.JsonSerDe` |
| `classification` | `json` |
| Location | `s3://<bucket>/{raw,curated}/<table>/<table>.jsonl` |
| **Partitions** | **none — on any table** |

**Why nothing is partitioned.** The whole lake is ~4 MB over 21,282 noon rows, which is far
below the size where partition pruning pays for its own complexity. So `ship_id` is an
**ordinary body column** everywhere, each table is a single JSONL file, and there is **no
partition projection, no crawler, and no `MSCK REPAIR`**. Do not write partition predicates;
there is nothing to prune.

A consequence of the JSON SerDe: **temporal columns are stored as strings**, not DATE. Cast
them (`CAST(report_date AS DATE)`) when you need date arithmetic.

---

## Provenance

Every column carries one of four tags. This is load-bearing — it is the difference between a
number you can defend and a number you made up.

| Tag | Meaning |
|---|---|
| **`measured`** | Read from the source data. Reproducible from `vt_fd` / `vessel` / `maintenance`. |
| **`class`** | A W1/W2 sister-ship design value — identical across the whole fleet. |
| **`estimated`** | **Synthesized. An assumption. Never quote as fact.** |
| **`derived`** | Computed in the curated zone from the columns above it. Inherits the weakest provenance of its inputs — a derived column fed by an estimated one is estimated. |

Qualifiers narrow the tag further: `measured (fitted)` is a least-squares fit **on** real
data; `measured (clipped)` survived the outlier gate; `estimated (USD)` is downstream of the
synthesized bunker price; `estimated (USD-derived)` is a *decision* made from USD figures.

The synthesized set, in one line: **the calendar epoch, all geography (lat/lon/heading/
ports), all USD, the UWI numeric signals, and event cost/downtime/location.**

---

## Raw zone (6 tables)

`noon_report`, `vessel_master` and `maintenance_event` are the three real source files,
landed **verbatim** — every row, every column, unmutated. `reference_curve`, `uwi` and
`fuel_price` are derived or synthesized and carry no preservation duty.

### `noon_report`

`dataset/vt_fd.csv`, landed **verbatim**: every row (including the 344 duplicates), every column, unmutated. The only additions are the two loader markers, which *preserve* the information the HIDDEN/PREDICT → null conversion would otherwise destroy.

**Grain:** ship × noon report — **NOT unique** on (ship_id, noon_utc) · **Rows:** 21,282 · **Columns:** 42

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | measured | 'De-identification Name' |
| 2 | `voyage` | string | measured | voyage no; unique only within a ship |
| 3 | `noon_utc` | int | measured | relative day; day 0 = the ship's earliest record |
| 4 | `avg_speed` | double | measured | SOG, kn |
| 5 | `speed_through_water` | double | measured | STW, kn |
| 6 | `me_avg_rpm` | double | measured | — |
| 7 | `propeller_speed` | double | measured | RPM |
| 8 | `fore_draft` | double | measured | m |
| 9 | `after_draft` | double | measured | m |
| 10 | `displacement` | double | measured | MT (68.5% fill) |
| 11 | `cargo_on_board` | double | measured | MT |
| 12 | `wind_scale` | double | measured | Beaufort |
| 13 | `sea_height` | double | measured | m |
| 14 | `sea_water_temp` | double | measured | deg C |
| 15 | `wind_speed` | double | measured | kn |
| 16 | `wind_direction` | double | measured | 16-point compass (0-15), NOT degrees |
| 17 | `swell_height` | double | measured | m |
| 18 | `swell_direction` | double | measured | 16-point compass (0-15) |
| 19 | `sea_direction` | double | measured | 16-point compass (0-15) |
| 20 | `water_depth` | double | measured | m (shallow-water gate) |
| 21 | `mid_draft` | double | measured | m |
| 22 | `total_distance` | double | measured | nm over ground |
| 23 | `sea_speed_distance` | double | measured | nm through water, full-speed hours |
| 24 | `diff_stw_sog_slip` | double | measured | STW-SOG delta (current proxy) |
| 25 | `full_spd_stw_slip` | double | measured | % |
| 26 | `horse_power` | double | measured | kW (H-class) |
| 27 | `load_pct` | double | measured | %MCR (H-class) |
| 28 | `sfoc` | double | measured | g/kWh (H-class) |
| 29 | `me_slip` | double | measured | % (H-class) |
| 30 | `thrust` | double | measured | kN (H-class) |
| 31 | `thrust_quotient` | double | measured | - (H-class) |
| 32 | `total_consump` | double | measured | MT/day incl. aux/boiler (T-class) |
| 33 | `me_consumption` | double | measured | MT/day (T-class) |
| 34 | `me_fullspeed_consump_hshfo` | double | measured | MT/day (T-class) |
| 35 | `me_fullspeed_consump_ulsfo` | double | measured | MT/day (T-class) |
| 36 | `me_fullspeed_consump_vlsfo` | double | measured | MT/day (T-class) |
| 37 | `me_fullspeed_consump_lsmgo` | double | measured | MT/day (T-class) |
| 38 | `me_fullspeed_consump_bio_hsfo` | double | measured | MT/day (T-class) |
| 39 | `hours_full_speed` | double | measured | hr |
| 40 | `hours_total` | double | measured | hr |
| 41 | `masked_flag` | boolean | measured | row had any HIDDEN/PREDICT cell (S21-S23 only) |
| 42 | `predict_fuel_type` | string | measured | the column marked PREDICT, else null |

### `vessel_master`

`dataset/vessel.jsonl`, verbatim. Hull particulars reverse-engineered from `vt_fd`; see [`vessel.md`](vessel.md).

**Grain:** ship · **Rows:** 15 · **Columns:** 32

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `imo_number` | string | estimated | SYNTHETIC (9800001-9800015), not a real IMO |
| 2 | `ship_id` | string | measured | joins noon_report.ship_id |
| 3 | `hull_class` | string | class | W1 / W2 (the two sister-ship groups) |
| 4 | `role` | string | measured | train (S1-S12) / predict (S21-S23) |
| 5 | `vessel_type` | string | class | container |
| 6 | `teu_nominal` | int | class | — |
| 7 | `loa_m` | double | class | — |
| 8 | `lpp_m` | double | class | — |
| 9 | `breadth_m` | double | class | — |
| 10 | `design_draft_m` | double | class | — |
| 11 | `scantling_draft_m` | double | class | — |
| 12 | `displacement_design_t` | double | measured | displacement-draft fit over vt_fd |
| 13 | `displacement_scantling_t` | double | measured | same fit, at scantling draft |
| 14 | `cb_design` | double | measured | — |
| 15 | `cb_scantling` | double | measured | — |
| 16 | `cw` | double | measured | waterplane coefficient |
| 17 | `tpc_t_per_cm` | double | measured | tonnes-per-cm (drives the displacement backfill) |
| 18 | `dwt` | double | estimated | scantling displacement minus estimated lightship |
| 19 | `gross_tonnage` | double | class | — |
| 20 | `lightship_t` | double | estimated | NOT derivable from the data |
| 21 | `mcr_kw` | double | measured | calm-water power curve at design speed |
| 22 | `ncr_kw` | double | measured | ~85% MCR |
| 23 | `mcr_rpm` | double | measured | upper envelope of me_avg_rpm |
| 24 | `design_speed_kn` | double | measured | STW at the knee of the calm-water curve |
| 25 | `propeller_type` | string | class | FPP |
| 26 | `propeller_variant` | string | measured | P1 (pitch 9.886 m) / P2 (9.556 m) |
| 27 | `n_blades` | int | class | — |
| 28 | `diameter_m` | double | class | — |
| 29 | `pitch_m` | double | measured | propeller_speed * 1852 / (60 * me_avg_rpm), median |
| 30 | `pitch_diameter_ratio` | double | measured | — |
| 31 | `transverse_area_m2` | double | estimated | windage area, NOT derivable from the data |
| 32 | `build_year` | int | estimated | NOT derivable from the data |

### `maintenance_event`

`dataset/maintenance.csv` split on `+` into atoms: 77 source rows → 115. Grouping on `(ship_id, event_day)` reconstructs the 77 source rows exactly.

**Grain:** ship × atomic event · **Rows:** 115 · **Columns:** 10

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | measured | — |
| 2 | `event_type` | string | measured (atomised) | PP / UWC / UWI / DD |
| 3 | `event_day` | int | measured | relative day, same axis as noon_report.noon_utc |
| 4 | `propeller_condition` | string | measured | Good / Fair / Poor (45/77 rows populated) |
| 5 | `hull_fouling_type` | string | measured | comma list barnacle/slime/algae/tubeworm/calcium |
| 6 | `hull_coating_condition` | string | measured | Good / Fair / Poor (26/77 rows populated) |
| 7 | `cavitation_found` | string | measured | Yes / No (36/77 rows populated) |
| 8 | `draft_fwd_m` | double | measured | — |
| 9 | `draft_aft_m` | double | measured | — |
| 10 | `source_event_type` | string | measured | the original composite (e.g. 'UWC+PP') |

### `reference_curve`

The clean-hull curve `P = a·V^n·(Δ/Δ_ref)^⅔`, **fitted** from clean-window valid noon points. Every ISO 19030 number keys off `curve_a` / `curve_n`.

**Grain:** ship × speed point (15 × 12) · **Rows:** 180 · **Columns:** 13

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ref_curve_id` | string | derived | RC-<ship_id> |
| 2 | `ship_id` | string | measured | — |
| 3 | `hull_class` | string | class | — |
| 4 | `propeller_variant` | string | measured | — |
| 5 | `speed_kn` | double | derived | the speed point |
| 6 | `shaft_power_kw` | double | measured (fitted) | clean-hull power at speed_kn, disp_ref |
| 7 | `displacement_ref_t` | double | class | the displacement the curve is fitted at |
| 8 | `curve_a` | double | measured (fitted) | PER SHIP scale |
| 9 | `curve_n` | double | measured (fitted) | POOLED speed exponent |
| 10 | `fit_pool` | string | derived | the pool the exponent came from: '<class>-<variant>', or '<class>' when the variant pool was too thin (S22 is the only W2-P1 ship, and a masked prediction ship at that, so its pool widens to the W2 hull class) |
| 11 | `n_fit_points` | int | measured | this ship's own clean-window valid points |
| 12 | `n_pool_points` | int | measured | the points behind the pooled exponent |
| 13 | `fit_rmse_pct` | double | measured | log-space RMSE of the fit, as % of power |

### `uwi`

The inspection projection: **real grades, estimated numbers**. The four numeric signals are synthesized, conditioned on the real grade and the real speed loss that day.

**Grain:** inspection (43 UWI atoms + 10 DD) · **Rows:** 53 · **Columns:** 13

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `inspection_id` | string | derived | UWI-<ship>-<day> |
| 2 | `ship_id` | string | measured | — |
| 3 | `inspection_day` | int | measured | relative day |
| 4 | `inspection_type` | string | measured | UWI (in-water) / DD (dry-dock) |
| 5 | `hull_fouling_rating` | int | estimated | 0-100, higher = more fouled |
| 6 | `hull_fouling_coverage_pct` | double | estimated | % of hull area fouled |
| 7 | `hull_fouling_type` | string | measured | comma list, verbatim from maintenance |
| 8 | `propeller_condition` | string | measured | REAL Good/Fair/Poor scale (not Rubert A-F) |
| 9 | `propeller_roughness_um` | double | estimated | conditioned on propeller_condition |
| 10 | `hull_coating_condition` | string | measured | Good / Fair / Poor |
| 11 | `coating_breakdown_pct` | double | estimated | conditioned on hull_coating_condition |
| 12 | `cavitation_found` | string | measured | Yes / No |
| 13 | `recommended_action` | string | derived | none / polish / clean |

### `fuel_price`

The synthesized bunker series. **Entirely estimated** — every USD figure in the lake descends from this table.

**Grain:** day × fuel (1,826 × 5) · **Rows:** 9,130 · **Columns:** 3

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `day` | int | derived | relative day, same axis as noon_report.noon_utc |
| 2 | `fuel_type` | string | derived | HSHFO / ULSFO / VLSFO / LSMGO / BIO_HSFO |
| 3 | `price_usd_per_mt` | double | estimated | bunker price (USD/t) |

---

## Curated zone (14 tables)

Every mutation (dedupe, outlier clipping, displacement backfill) and every derivation
(ISO 15016/19030, CII, geography, economics) happens here.

### `fact_performance_daily`

The analytical spine. Every other curated table reads it. One row per day the ship reported, including days that fail the ISO gate; `valid_flag` says which may be fitted on.

**Grain:** ship × day — **unique** · **Rows:** 20,938 · **Columns:** 60

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | measured | — |
| 2 | `noon_utc` | int | measured | relative day (the join key) |
| 3 | `report_date` | string | estimated | YYYY-MM-DD, epoch day 0 = 2021-07-01 |
| 4 | `year` | int | estimated | calendar year (needed for the CII required line) |
| 5 | `month` | int | estimated | calendar month |
| 6 | `voyage` | string | measured | — |
| 7 | `hull_class` | string | class | — |
| 8 | `fleet_id` | string | class | FL-W1 / FL-W2 (fleet == hull class) |
| 9 | `latitude` | double | estimated | geography, draped along the voyage rotation |
| 10 | `longitude` | double | estimated | geography |
| 11 | `heading_deg` | double | estimated | bearing along the synthesized route |
| 12 | `port_from` | string | estimated | the rotation's origin LOCODE |
| 13 | `port_to` | string | estimated | the rotation's destination LOCODE |
| 14 | `speed_through_water` | double | measured | STW, kn |
| 15 | `avg_speed` | double | measured | SOG, kn |
| 16 | `me_avg_rpm` | double | measured | — |
| 17 | `horse_power` | double | measured (clipped) | kW |
| 18 | `displacement` | double | measured | measured, or backfilled from draft (see displacement_source) |
| 19 | `displacement_source` | string | measured | measured / backfilled |
| 20 | `mean_draft_m` | double | measured | (fore + after) / 2 |
| 21 | `cargo_on_board` | double | measured | MT |
| 22 | `hours_full_speed` | double | measured | hr |
| 23 | `hours_total` | double | measured (clipped to 24) | hr |
| 24 | `total_distance` | double | measured | nm |
| 25 | `wind_scale` | double | measured | Beaufort |
| 26 | `wind_speed` | double | measured | kn |
| 27 | `sea_height` | double | measured | m |
| 28 | `resistance_wind_kn` | double | derived | ISO 15016: Blendermann wind added resistance (kN) |
| 29 | `resistance_wave_kn` | double | derived | ISO 15016: STAWAVE-1 wave added resistance (kN) |
| 30 | `power_corrected_kw` | double | derived | ISO 15016: horse_power - wind/wave power |
| 31 | `speed_corrected_kn` | double | derived | ISO 15016: STW (current is already excluded) |
| 32 | `v_expected_kn` | double | derived | ISO 19030: clean-hull speed at the corrected power |
| 33 | `speed_loss_pct` | double | derived | ISO 19030: (v_expected - STW) / v_expected * 100 |
| 34 | `slip_apparent` | double | derived | (V_th - SOG) / V_th |
| 35 | `slip_real` | double | derived | (V_th - STW) / V_th |
| 36 | `sfoc_g_kwh` | double | measured | source SFOC (clipped) |
| 37 | `admiralty_coef` | double | derived | disp^(2/3) * STW^3 / power |
| 38 | `eeoi` | double | derived | gCO2 / t.nm; null on ballast / zero-cargo days |
| 39 | `fuel_type` | string | measured | the day's ME fuel (from the me_fullspeed_consump_* columns) |
| 40 | `total_foc_mt` | double | measured | total_consump |
| 41 | `me_foc_mt` | double | measured | me_consumption |
| 42 | `co2_mt` | double | derived | total_foc_mt * carbon factor |
| 43 | `excess_foc_mt` | double | derived | fuel wasted to fouling: me_foc * [1 - (1-s)^n] |
| 44 | `excess_cost_usd` | double | estimated (USD) | excess_foc * fuel price |
| 45 | `cum_excess_cost_usd` | double | estimated (USD) | running sum within the fouling cycle |
| 46 | `excess_cost_fouling_usd` | double | estimated (USD) | = excess_cost_usd |
| 47 | `excess_cost_weather_usd` | double | estimated (USD) | wind+wave channel |
| 48 | `excess_cost_operational_usd` | double | estimated (USD) | off-design engine-load channel |
| 49 | `cii_aer` | double | derived | annual AER attained (gCO2/dwt.nm), broadcast onto each day |
| 50 | `cii_rating_aer` | string | derived | A-E vs the base reference line |
| 51 | `cii_imo` | double | derived | annual IMO attained (= AER for container ships) |
| 52 | `cii_rating_imo` | string | derived | A-E vs the year's reduced required line |
| 53 | `days_since_cleaning` | int | derived | resets on UWC / DD |
| 54 | `days_since_polish` | int | derived | resets on PP / DD |
| 55 | `days_since_dry_dock` | int | derived | resets on DD |
| 56 | `anomaly_flag` | boolean | derived | filled from fact_anomaly |
| 57 | `anomaly_cause` | string | derived | filled from fact_anomaly |
| 58 | `anomaly_severity` | string | derived | filled from fact_anomaly |
| 59 | `valid_flag` | boolean | derived | ISO 19030 gate (>=22h full speed, Bft <=4, deep water, ...) |
| 60 | `masked_flag` | boolean | measured | S21-S23 masked window |

### `fact_performance_indicator`

The four ISO 19030 period indicators, long format. `value` / `reference_value` mean different things per `indicator` — see the enum table below.

**Grain:** ship × indicator × period/event · **Rows:** 87 · **Columns:** 9

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `indicator` | string | derived | ISP / DDP / ME / MT |
| 3 | `period_start_day` | int | derived | ISP: cycle start |
| 4 | `period_end_day` | int | derived | ISP: cycle end; DDP: event_day + 45 |
| 5 | `event_type` | string | derived | ME, DDP: the event the row is keyed to |
| 6 | `event_day` | int | derived | ME, DDP, MT: event / crossing day |
| 7 | `value` | double | derived | per indicator (see doc) |
| 8 | `reference_value` | double | derived | per indicator (see doc) |
| 9 | `detail` | string | derived | free-text |

### `fact_uwi`

The raw `uwi` projection + the calendar + the real 14-day trailing speed loss measured at the inspection.

**Grain:** inspection · **Rows:** 53 · **Columns:** 15

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `inspection_id` | string | derived | — |
| 3 | `inspection_day` | int | measured | — |
| 4 | `inspection_date` | string | estimated | calendar |
| 5 | `inspection_type` | string | measured | UWI / DD |
| 6 | `hull_fouling_rating` | int | estimated | — |
| 7 | `hull_fouling_coverage_pct` | double | estimated | — |
| 8 | `hull_fouling_type` | string | measured | — |
| 9 | `propeller_condition` | string | measured | Good / Fair / Poor |
| 10 | `propeller_roughness_um` | double | estimated | — |
| 11 | `hull_coating_condition` | string | measured | — |
| 12 | `coating_breakdown_pct` | double | estimated | — |
| 13 | `cavitation_found` | string | measured | — |
| 14 | `recommended_action` | string | derived | — |
| 15 | `speed_loss_pct` | double | measured | the 14-day trailing ISO 19030 speed loss at inspection |

### `fact_maintenance_event`

The 115 atoms + estimated economics + the maintenance-effect columns.

**Grain:** ship × atomic event · **Rows:** 115 · **Columns:** 17

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `event_id` | string | derived | MV-<ship>-<day>-<type> |
| 3 | `event_day` | int | measured | — |
| 4 | `event_date` | string | estimated | calendar |
| 5 | `event_type` | string | measured (atomised) | PP / UWC / UWI / DD |
| 6 | `source_event_type` | string | measured | the original composite |
| 7 | `propeller_condition` | string | measured | — |
| 8 | `hull_coating_condition` | string | measured | — |
| 9 | `hull_fouling_type` | string | measured | — |
| 10 | `cavitation_found` | string | measured | — |
| 11 | `draft_fwd_m` | double | measured | — |
| 12 | `draft_aft_m` | double | measured | — |
| 13 | `cost_usd` | double | estimated | per-type cost model |
| 14 | `downtime_hours` | double | estimated | — |
| 15 | `location` | string | estimated | the port nearest the synthesized track that day |
| 16 | `me_recovery_pct` | double | derived | (before - after) / before * 100 from the ME indicator |
| 17 | `payback_days` | double | estimated (USD-derived) | full cost / daily excess-cost saving |

### `dim_vessel`

`vessel_master` + the curated joins: fleet, reference-curve FK, dry-dock clock. `last_dry_dock_*` is **null for S9–S12 and S23** — they never dry-docked.

**Grain:** ship · **Rows:** 15 · **Columns:** 37

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `imo_number` | string | estimated | SYNTHETIC (9800001-9800015), not a real IMO |
| 2 | `ship_id` | string | measured | joins noon_report.ship_id |
| 3 | `hull_class` | string | class | W1 / W2 (the two sister-ship groups) |
| 4 | `role` | string | measured | train (S1-S12) / predict (S21-S23) |
| 5 | `vessel_type` | string | class | container |
| 6 | `teu_nominal` | int | class | — |
| 7 | `loa_m` | double | class | — |
| 8 | `lpp_m` | double | class | — |
| 9 | `breadth_m` | double | class | — |
| 10 | `design_draft_m` | double | class | — |
| 11 | `scantling_draft_m` | double | class | — |
| 12 | `displacement_design_t` | double | measured | displacement-draft fit over vt_fd |
| 13 | `displacement_scantling_t` | double | measured | same fit, at scantling draft |
| 14 | `cb_design` | double | measured | — |
| 15 | `cb_scantling` | double | measured | — |
| 16 | `cw` | double | measured | waterplane coefficient |
| 17 | `tpc_t_per_cm` | double | measured | tonnes-per-cm (drives the displacement backfill) |
| 18 | `dwt` | double | estimated | scantling displacement minus estimated lightship |
| 19 | `gross_tonnage` | double | class | — |
| 20 | `lightship_t` | double | estimated | NOT derivable from the data |
| 21 | `mcr_kw` | double | measured | calm-water power curve at design speed |
| 22 | `ncr_kw` | double | measured | ~85% MCR |
| 23 | `mcr_rpm` | double | measured | upper envelope of me_avg_rpm |
| 24 | `design_speed_kn` | double | measured | STW at the knee of the calm-water curve |
| 25 | `propeller_type` | string | class | FPP |
| 26 | `propeller_variant` | string | measured | P1 (pitch 9.886 m) / P2 (9.556 m) |
| 27 | `n_blades` | int | class | — |
| 28 | `diameter_m` | double | class | — |
| 29 | `pitch_m` | double | measured | propeller_speed * 1852 / (60 * me_avg_rpm), median |
| 30 | `pitch_diameter_ratio` | double | measured | — |
| 31 | `transverse_area_m2` | double | estimated | windage area, NOT derivable from the data |
| 32 | `build_year` | int | estimated | NOT derivable from the data |
| 33 | `fleet_id` | string | class | FL-W1 / FL-W2 |
| 34 | `fleet_name` | string | class | W1 Class / W2 Class |
| 35 | `ref_curve_id` | string | derived | FK -> dim_reference_curve.ref_curve_id |
| 36 | `last_dry_dock_day` | int | measured | latest DD event_day; null for S9-S12, S23 |
| 37 | `last_dry_dock_date` | string | estimated | calendar |

### `dim_reference_curve`

Pass-through of raw `reference_curve` (identical columns).

**Grain:** ship × speed point · **Rows:** 180 · **Columns:** 13

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ref_curve_id` | string | derived | RC-<ship_id> |
| 2 | `ship_id` | string | measured | — |
| 3 | `hull_class` | string | class | — |
| 4 | `propeller_variant` | string | measured | — |
| 5 | `speed_kn` | double | derived | the speed point |
| 6 | `shaft_power_kw` | double | measured (fitted) | clean-hull power at speed_kn, disp_ref |
| 7 | `displacement_ref_t` | double | class | the displacement the curve is fitted at |
| 8 | `curve_a` | double | measured (fitted) | PER SHIP scale |
| 9 | `curve_n` | double | measured (fitted) | POOLED speed exponent |
| 10 | `fit_pool` | string | derived | the pool the exponent came from: '<class>-<variant>', or '<class>' when the variant pool was too thin (S22 is the only W2-P1 ship, and a masked prediction ship at that, so its pool widens to the W2 hull class) |
| 11 | `n_fit_points` | int | measured | this ship's own clean-window valid points |
| 12 | `n_pool_points` | int | measured | the points behind the pooled exponent |
| 13 | `fit_rmse_pct` | double | measured | log-space RMSE of the fit, as % of power |

### `dim_port`

The 10 LOCODEs the synthesized geography draws from. Real ports, real coordinates — but **this fleet never called at them**.

**Grain:** port · **Rows:** 10 · **Columns:** 5

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `locode` | string | derived | — |
| 2 | `name` | string | derived | — |
| 3 | `lat` | double | derived | — |
| 4 | `lon` | double | derived | — |
| 5 | `is_eu` | boolean | derived | — |

### `agg_fleet_daily`

⚠️ Carries a synthetic `fleet_id = 'ALL'` rollup row alongside `FL-W1` / `FL-W2`. **Always filter `fleet_id`** or every aggregate double-counts.

**Grain:** fleet × day (1,826 × 3) · **Rows:** 5,478 · **Columns:** 14

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `fleet_id` | string | derived | ALL / FL-W1 / FL-W2 |
| 2 | `noon_utc` | int | measured | relative day |
| 3 | `report_date` | string | estimated | calendar |
| 4 | `year` | int | estimated | — |
| 5 | `month` | int | estimated | — |
| 6 | `n_vessels` | int | derived | — |
| 7 | `avg_speed_loss_pct` | double | derived | mean of valid daily speed_loss_pct |
| 8 | `total_excess_cost_usd` | double | estimated (USD) | — |
| 9 | `cii_count_a` | int | derived | — |
| 10 | `cii_count_b` | int | derived | — |
| 11 | `cii_count_c` | int | derived | — |
| 12 | `cii_count_d` | int | derived | — |
| 13 | `cii_count_e` | int | derived | — |
| 14 | `n_alerts` | int | derived | — |

### `fact_voyage`

A voyage here is a multi-month **rotation**, not a port-to-port leg. `distance_nm` / `total_foc_mt` / `co2_mt` are plain sums of the real dailies, so the energy balance is exact by construction.

**Grain:** ship × voyage · **Rows:** 300 · **Columns:** 19

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `voyage_no` | string | measured | — |
| 3 | `hull_class` | string | class | — |
| 4 | `from_port` | string | estimated | rotation origin LOCODE |
| 5 | `to_port` | string | estimated | rotation destination LOCODE |
| 6 | `depart_day` | int | measured | min noon_utc of the group |
| 7 | `arrive_day` | int | measured | max noon_utc of the group |
| 8 | `depart_date` | string | estimated | calendar |
| 9 | `arrive_date` | string | estimated | calendar |
| 10 | `distance_nm` | double | measured | sum of the real daily total_distance |
| 11 | `sea_days` | int | measured | rows in the voyage |
| 12 | `avg_speed_kn` | double | measured | distance_nm / sum(hours_total) |
| 13 | `total_foc_mt` | double | measured | sum of the real daily total_consump (energy balance) |
| 14 | `fuel_cost_usd` | double | estimated (USD) | each day priced by its own fuel |
| 15 | `co2_mt` | double | derived | sum of the daily co2_mt |
| 16 | `avg_speed_loss_pct` | double | derived | mean of the valid daily speed_loss_pct |
| 17 | `usd_per_nm` | double | estimated (USD) | — |
| 18 | `on_time_flag` | boolean | estimated | actual days <= planned days |
| 19 | `planned_days` | int | estimated | rotation path / (0.85 * design speed * 24) |

### `fact_anomaly`

One row per flagged (ship, day), at the driver metric. **Biofouling is never a cause here** — it is a trend, not a point event.

**Grain:** ship × flagged day · **Rows:** 369 · **Columns:** 8

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `noon_utc` | int | derived | — |
| 3 | `report_date` | string | estimated | calendar |
| 4 | `metric` | string | derived | speed_loss / slip / sfoc / excess_foc |
| 5 | `value` | double | derived | — |
| 6 | `z_score` | double | derived | robust (median/MAD) z |
| 7 | `severity` | string | derived | low / medium / high |
| 8 | `cause` | string | derived | engine_degradation / propeller / weather / sensor |

### `fact_alert`

The narration layer. Runs no new detection: it collapses anomaly days into episodes and adds the biofouling trend. Bilingual messages.

**Grain:** alert episode · **Rows:** 222 · **Columns:** 18

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `alert_id` | string | derived | AL-<ship>-<opened_day>-<cause> |
| 3 | `fleet_id` | string | derived | — |
| 4 | `opened_day` | int | derived | — |
| 5 | `last_seen_day` | int | derived | — |
| 6 | `opened_date` | string | estimated | calendar |
| 7 | `last_seen_date` | string | estimated | calendar |
| 8 | `cause` | string | derived | hull_biofouling / propeller / engine_degradation / weather / sensor |
| 9 | `severity` | string | derived | low / medium / high |
| 10 | `driver_metric` | string | derived | speed_loss / slip / sfoc / excess_foc |
| 11 | `peak_value` | double | derived | — |
| 12 | `peak_z` | double | derived | null for biofouling (a trend, not a z) |
| 13 | `excess_cost_usd` | double | estimated (USD) | — |
| 14 | `recommended_action` | string | derived | — |
| 15 | `status` | string | derived | open / closed |
| 16 | `source` | string | derived | anomaly / fouling_model |
| 17 | `message_zh` | string | derived | — |
| 18 | `message_en` | string | derived | — |

### `fact_recommendation`

The closed-form optimal hull-cleaning interval, `T* = √(2K/β)`. One row per ship; 5 are `insufficient_history`.

**Grain:** ship · **Rows:** 15 · **Columns:** 9

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `last_cleaning_day` | int | measured | latest UWC/DD reset |
| 3 | `recommended_clean_day` | int | derived | last_cleaning_day + round(T*) |
| 4 | `recommended_clean_date` | string | estimated | calendar |
| 5 | `trigger_eta_day` | int | derived | day the open cycle reaches the 8% speed-loss trigger |
| 6 | `t_star_days` | double | estimated (USD-derived) | T* = sqrt(2K/beta) |
| 7 | `fouling_rate_pct_per_day` | double | measured | open-cycle speed-loss slope |
| 8 | `net_saving_usd` | double | estimated (USD) | — |
| 9 | `status` | string | derived | ok / insufficient_history |

### `fact_maintenance_recommendation`

Every action a ship actually needs, batched into shared service windows. A ship with nothing due has no rows.

**Grain:** ship × due action · **Rows:** 20 · **Columns:** 17

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `action_type` | string | derived | hull_cleaning / propeller_polishing / propeller_repair / coating_renewal / engine_inspection |
| 3 | `priority` | string | derived | high / medium / low |
| 4 | `due_day` | int | derived | forecast threshold crossing, bounded to the priority window |
| 5 | `due_date` | string | estimated | calendar |
| 6 | `rationale` | string | derived | — |
| 7 | `source` | string | derived | uwi / anomaly / fouling_model / sfoc_trend / uwi+anomaly |
| 8 | `degradation_rate` | double | derived | Theil-Sen slope of the action's signal (per day) |
| 9 | `degradation_unit` | string | derived | %/day or um/day |
| 10 | `current_value` | double | derived | — |
| 11 | `threshold_value` | double | derived | 8 (hull) / 300, 430 (propeller um) / 45 (coating %) / 5 (engine %) |
| 12 | `trigger_eta_day` | int | derived | — |
| 13 | `t_star_days` | double | estimated (USD-derived); economic actions only | — |
| 14 | `net_saving_usd` | double | estimated (USD); economic actions only | — |
| 15 | `plan_day` | int | derived | the batched service window this action folds into |
| 16 | `plan_date` | string | estimated | calendar |
| 17 | `plan_service_type` | string | derived | dry_dock / in_water |

### `fact_speed_profile`

The slow-steaming economics. `usd_per_nm` is convex **only** because of the per-day charter cost; drop it and the argmin degenerates to the slowest point.

**Grain:** ship × speed-grid point (15 × 24) · **Rows:** 360 · **Columns:** 13

| # | column | type | provenance | unit / notes |
|---:|---|---|---|---|
| 1 | `ship_id` | string | derived | — |
| 2 | `speed_kn` | double | derived | 24 points, 0.5 - 1.0 x design speed |
| 3 | `shaft_power_kw` | double | derived | clean-hull power from the reference curve |
| 4 | `foc_mt_per_day` | double | derived | fouling-inflated daily burn at the latest speed loss |
| 5 | `co2_mt_per_day` | double | derived | — |
| 6 | `fuel_usd_per_day` | double | estimated (USD) | — |
| 7 | `charter_usd_per_day` | double | estimated (USD) | the time cost; not a measured particular |
| 8 | `usd_per_day` | double | estimated (USD) | — |
| 9 | `usd_per_nm` | double | estimated (USD) | convex; its argmin is the economical speed |
| 10 | `fuel_usd_per_nm` | double | estimated (USD) | fuel-only, strictly increasing |
| 11 | `recommended_speed_kn` | double | derived | the usd_per_nm argmin (repeated on all 24 rows) |
| 12 | `current_speed_kn` | double | derived | latest valid STW (repeated) |
| 13 | `annual_distance_nm` | double | measured | annualised sum of total_distance (repeated) |


---

## Enum reference

| Column | Values |
|---|---|
| `event_type` (atomic) | `PP` polish · `UWC` hull clean · `UWI` inspect · `DD` dry dock |
| `source_event_type` | `PP` · `UWI` · `UWC` · `DD` · `UWI+PP` · `UWC+PP` (the 6 source composites) |
| `propeller_condition` | `Good` · `Fair` · `Poor` |
| `hull_coating_condition` | `Good` · `Fair` — **`Poor` never occurs in the source** |
| `hull_fouling_type` | comma list of `barnacle` · `slime` · `algae` · `tubeworm` · `calcium` (inconsistent order/spacing — parse as a set) |
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
| `cause` (anomaly) | `engine_degradation` · `propeller` · `sensor` · `weather` (**never fires** — see below) |
| `cause` (alert) | the above + `hull_biofouling` |
| `severity` | `low` · `medium` · `high` |
| `status` (alert) | `open` · `closed` |
| `source` (alert) | `anomaly` · `fouling_model` |
| `action_type` | `hull_cleaning` · `propeller_polishing` · `propeller_repair` · `coating_renewal` · `engine_inspection` |
| `plan_service_type` | `dry_dock` · `in_water` |
| `status` (recommendation) | `ok` · `insufficient_history` |

**On `indicator`** — `value` and `reference_value` mean different things per code:

| Code | `value` | `reference_value` |
|---|---|---|
| `ISP` | this cleaning cycle's mean speed loss | the **first** cycle's mean |
| `DDP` | mean speed loss in the 45 d **after** the dry dock | mean in the 45 d before |
| `ME` | `before − after` (positive = the hull recovered) | `before` |
| `MT` | `8.0` (the trigger) | null |

**On the `weather` anomaly cause** — it is in the enum but is **unreachable**. The rule needs
`wind_scale ≥ 5`, and anomalies are only scored on `valid_flag` rows, which the ISO gate
already restricts to Beaufort ≤ 4. It will never appear in the data.

---

## Worked queries

```sql
-- Speed-loss trend for one ship, ISO-valid points only.
-- valid_flag is the gate: without it you are plotting weather, not hull condition.
SELECT report_date, speed_loss_pct, days_since_cleaning
FROM   fact_performance_daily
WHERE  ship_id = 'S4' AND valid_flag AND speed_loss_pct IS NOT NULL
ORDER  BY noon_utc;
```

```sql
-- Fleet speed loss over time. NOTE the fleet_id filter — without it the 'ALL'
-- rollup row is summed alongside the two sub-fleets it already contains.
SELECT report_date, avg_speed_loss_pct, n_vessels
FROM   agg_fleet_daily
WHERE  fleet_id = 'ALL'            -- or 'FL-W1' / 'FL-W2'; never omit
ORDER  BY noon_utc;
```

```sql
-- Did the hull cleanings actually work? ME = speed loss recovered at each event.
SELECT e.ship_id, e.event_day, e.event_type, e.me_recovery_pct, e.payback_days
FROM   fact_maintenance_event e
WHERE  e.event_type IN ('UWC', 'DD') AND e.me_recovery_pct IS NOT NULL
ORDER  BY e.me_recovery_pct DESC;
```

```sql
-- The 102 PREDICT cells: the hackathon's actual deliverable.
SELECT ship_id, noon_utc, predict_fuel_type
FROM   noon_report
WHERE  predict_fuel_type IS NOT NULL
ORDER  BY ship_id, noon_utc;       -- 102 rows: 91 HSHFO + 11 VLSFO
```

```sql
-- Speed-power scatter against the fitted clean-hull curve, for one ship.
SELECT d.speed_through_water, d.power_corrected_kw, c.speed_kn, c.shaft_power_kw
FROM   fact_performance_daily d
FULL OUTER JOIN dim_reference_curve c ON c.ship_id = d.ship_id
WHERE  d.ship_id = 'S4' AND d.valid_flag;
```

```sql
-- Check a ship's curve before you trust its speed loss: n_fit_points below 8
-- means the ship borrowed its pool's scale (S6, S8, S21, S22 do).
SELECT DISTINCT ship_id, fit_pool, curve_a, curve_n, n_fit_points, fit_rmse_pct
FROM   dim_reference_curve
ORDER  BY n_fit_points;
```

```sql
-- The economical speed, per ship (repeated on all 24 grid rows).
SELECT DISTINCT ship_id, recommended_speed_kn, current_speed_kn
FROM   fact_speed_profile
ORDER  BY ship_id;
```
