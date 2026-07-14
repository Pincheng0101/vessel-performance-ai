# Table Schema — Athena / Glue Data Dictionary

Per-table reference for every table in the `ym_datalake_poc` data lake: grain,
S3 location, partitioning, every column (type / nullability / meaning), one
verbatim sample row, plus an enum reference and Athena query examples.

**Source of truth for types/partitions:** `deployment/athena_tool_stack.py`
(the `*_COLUMNS` lists and the `CfnTable` definitions). Column *meanings* come
from `doc/synthetic-dataset.md` (raw), `doc/curated-dataset.md` (M2),
`doc/insights.md` (M3) and the ETL source. Sample rows are copied verbatim from
`tmp/**/*.jsonl` (generated with `--seed 42`).

> Chinese version: `doc/table-schema-zh.md`.

---

## 1. Overview

### 1.1 Catalog coordinates

| Setting | Value |
|---|---|
| Glue database | `ym_datalake_poc` |
| Athena catalog | `AwsDataCatalog` |
| Athena workgroup | `ym-datalake-poc` (enforces its own result location) |
| Region | `us-west-2` |

All 20 tables are `EXTERNAL_TABLE`s over **JSONL** (one JSON object per line),
read with the OpenX `org.openx.data.jsonserde.JsonSerDe` and Glue table
parameter `classification=json`. They are **not** Parquet. The SerDe maps JSON
keys to columns **by name**, so a redundant body key that is also a partition
column is simply ignored.

### 1.2 Two S3 zones

| Zone | Prefix | Produced by |
|---|---|---|
| Raw (M1) | `s3://<DataLakeBucket>/raw/…` | `ym_datalake.synthetic_data` generator |
| Curated (M2 + M3) | `s3://<DataLakeBucket>/curated/…` | `ym_datalake.etl` (M2 ISO 15016/19030 + M3 statistics) |

`<DataLakeBucket>` is a CDK-assigned bucket name emitted as the
`DataLakeBucketName` stack output at deploy time. The `tmp/truth/` ground-truth
tree is **never uploaded or catalogued** (validation only).

### 1.3 Partition projection (no crawler, no `MSCK`)

9 tables use **Hive partition projection** — Athena computes partition
locations from the table properties, so there is no crawler and no
`MSCK REPAIR TABLE`. The 11 other tables are unpartitioned (a single flat prefix).

| Partition scheme | Tables | Projection |
|---|---|---|
| `imo_number` + `year` | `noon_report` | imo enum (9 IMOs); year integer `2021,2026` |
| `imo_number` + `year` + `month` | `fact_performance_daily` | + month integer `1,12` (2 digits) |
| `imo_number` only | `fact_performance_indicator`, `fact_uwi`, `fact_maintenance_event`, `fact_anomaly`, `fact_alert`, `fact_voyage`, `fact_speed_profile` | imo enum (9 IMOs) |

The `imo_number` enum is the static fleet `9700001`–`9700009`
(`synthetic_data.fleet.IMO_NUMBERS`). **Always add a partition predicate**
(`WHERE imo_number=… AND year=…`) so Athena prunes to the matching prefixes
instead of scanning the whole table.

### 1.4 S3 layout

```
s3://<DataLakeBucket>/
├── raw/                                        # M1
│   ├── noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl   # projected
│   ├── vessel_master/vessel_master.jsonl
│   ├── reference_curve/reference_curve.jsonl
│   ├── uwi/uwi.jsonl
│   ├── maintenance_event/maintenance_event.jsonl
│   └── fuel_price/fuel_price.jsonl
└── curated/                                    # M2 + M3
    ├── fact_performance_daily/imo_number=<imo>/year=<yyyy>/month=<mm>/data.jsonl  # projected
    ├── fact_performance_indicator/imo_number=<imo>/data.jsonl                     # projected
    ├── fact_uwi/imo_number=<imo>/data.jsonl                                       # projected
    ├── fact_maintenance_event/imo_number=<imo>/data.jsonl                         # projected
    ├── fact_anomaly/imo_number=<imo>/data.jsonl                                   # projected (M3)
    ├── fact_alert/imo_number=<imo>/data.jsonl                                     # projected (M3)
    ├── fact_voyage/imo_number=<imo>/data.jsonl                                    # projected (M2, voyage rollup)
    ├── fact_speed_profile/imo_number=<imo>/data.jsonl                             # projected (M2, speed optimizer)
    ├── dim_port/dim_port.jsonl
    ├── dim_vessel/dim_vessel.jsonl
    ├── dim_reference_curve/dim_reference_curve.jsonl
    ├── agg_fleet_daily/agg_fleet_daily.jsonl
    ├── fact_recommendation/fact_recommendation.jsonl                             # M3
    └── fact_maintenance_recommendation/fact_maintenance_recommendation.jsonl     # M3
```

### 1.5 Conventions

- **All temporal fields are `string`** — `YYYY-MM-DD` (dates) or
  `YYYY-MM-DD HH:MM:SS` (datetimes). The JSON SerDe's timestamp parsing is
  brittle, so dates are stored as text and callers **`CAST(col AS date)`** when
  they need date arithmetic or ordering.
- **Nulls:** any non-finite float (`NaN`/`Inf`) is written as `null` (the SerDe
  rejects `NaN`). Beyond that, nulls are *semantic*: ISO/derived columns are null
  on in-port days and gross power outliers; `eeoi` is null on ballast / zero-cargo
  days; M2 emits the anomaly / maintenance-effect / recommendation stub columns
  null and **M3 fills them**.
- **Partition keys vs body keys.** Partition keys are declared separately and
  are *not* in the body `*_COLUMNS` lists. But the generated JSONL bodies still
  carry some of them redundantly: `noon_report` bodies repeat `imo_number`;
  `fact_performance_daily` bodies repeat `imo_number`, `year`, `month`; the
  imo-partitioned curated bodies repeat `imo_number`. Athena reads those values
  from the S3 path, so the redundant body copies are ignored. (In
  `agg_fleet_daily`, `fact_recommendation` and `fact_maintenance_recommendation`,
  which are flat, `year`/`month`/`imo_number` are ordinary body columns, not
  partition keys.)

### 1.6 Fleet

9 synthetic 7-digit IMOs `9700001`–`9700009`, container ships Feeder→ULCV.
**`9700006` = YM WELLNESS** is the Dashboard deep-dive vessel (an engineered
fouling-rise → threshold → clean → recover storyline). Data spans
**2021-07-01 … 2026-06-30** (5 years).

3 operational fleets group the 9 vessels: **`FL-IA`** Intra-Asia, **`FL-TP`**
Trans-Pacific, **`FL-AE`** Asia-Europe (carried on `vessel_master`/`dim_vessel`;
`agg_fleet_daily` adds an **`ALL`** rollup grain).

| IMO | Name | Class | Fleet |
|---|---|---|---|
| 9700001 | YM HARMONY | Feeder | FL-IA |
| 9700002 | YM ENLIGHTEN | Feedermax | FL-IA |
| 9700003 | YM PLENTY | Panamax (scrubber) | FL-IA |
| 9700004 | YM PROSPER | Panamax | FL-TP |
| 9700005 | YM EXCELLENCE | Post-Panamax | FL-TP |
| **9700006** | **YM WELLNESS** | **Neo-Panamax (deep-dive)** | **FL-AE** |
| 9700007 | YM WARRANTY | Neo-Panamax | FL-AE |
| 9700008 | YM TRIUMPH | Post-Panamax | FL-TP |
| 9700009 | YM TITAN | ULCV (scrubber) | FL-AE |

### 1.7 Table summary

| # | Table | Zone / milestone | Grain | Partition keys | Body cols |
|---|---|---|---|---|---|
| 1 | `noon_report` | raw / M1 | vessel × day | imo_number, year | 47 |
| 2 | `vessel_master` | raw / M1 | vessel | — | 21 |
| 3 | `reference_curve` | raw / M1 | vessel × speed point | — | 5 |
| 4 | `uwi` | raw / M1 | inspection | — | 11 |
| 5 | `maintenance_event` | raw / M1 | event | — | 7 |
| 6 | `fuel_price` | raw / M1 | day × fuel | — | 3 |
| 7 | `fact_performance_daily` | curated / M2 | vessel × day | imo_number, year, month | 35 |
| 8 | `fact_performance_indicator` | curated / M2 | vessel × indicator | imo_number | 8 |
| 9 | `fact_uwi` | curated / M2 | inspection | imo_number | 10 |
| 10 | `fact_maintenance_event` | curated / M2 (+M3 cols) | event | imo_number | 8 |
| 11 | `dim_vessel` | curated / M2 | vessel | — | 21 |
| 12 | `dim_reference_curve` | curated / M2 | vessel × speed point | — | 5 |
| 13 | `agg_fleet_daily` | curated / M2 (+M3 col) | fleet × day (`ALL` rollup + sub-fleets) | — | 13 |
| 14 | `fact_recommendation` | curated / M3 | vessel | — | 8 |
| 15 | `fact_anomaly` | curated / M3 | flagged (vessel, day) | imo_number | 6 |
| 16 | `fact_maintenance_recommendation` | curated / M3 | vessel × action | — | 15 |
| 17 | `fact_alert` | curated / M3 | alert episode (vessel × episode) | imo_number | 15 |
| 18 | `fact_voyage` | curated / M2 | vessel × voyage (rotation leg) | imo_number | 16 |
| 19 | `dim_port` | curated / M2 | port | — | 5 |
| 20 | `fact_speed_profile` | curated / M2 (Phase 2) | vessel × speed-grid point | imo_number | 13 |

> **Trigger-threshold note.** The maintenance trigger is **8 %**
> (`periods.MT_TRIGGER_PCT = 8.0`), which drives `fact_performance_indicator`
> `indicator=MT` and `fact_recommendation.trigger_eta`. Spec §5.5 and the
> WELLNESS narrative describe it as ~10 %. **The 8 % code value is
> authoritative** for the data in these tables; the ~10 % is prose only.

---

## 2. Raw zone (M1)

Six datasets landed by the generator. Temporal fields are strings; NaN/Inf → null.

### 2.1 `noon_report`

Grain: one row per vessel per day. Location:
`s3://<DataLakeBucket>/raw/noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl`.
Partitioned by **`imo_number`** (enum, 9 IMOs) + **`year`** (integer `2021,2026`)
via projection. The body repeats `imo_number` (ignored). C-rule tags reference
the §3.2 consistency checks.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| year | int | No | *(partition)* calendar year of the report |
| report_id | string | No | `NR-<imo>-<date>` |
| vessel_name | string | No | vessel name |
| report_datetime_utc | string | No | `YYYY-MM-DD HH:MM:SS`, noon UTC |
| voyage_no | string | No | voyage number |
| leg | string | No | leg code (`<from>-<to>`) |
| port_from | string | No | departure UN/LOCODE |
| port_to | string | No | arrival UN/LOCODE |
| voyage_phase | string | No | `at_sea` / `in_port` |
| latitude | double | No | position latitude (°) |
| longitude | double | No | position longitude (°) |
| heading_deg | double | No | vessel heading (°); needed so ETL can reconstruct wind/wave correction |
| steaming_hours | double | No | hours steamed (≈24 at sea, 0 in port) |
| distance_og_nm | double | No | distance over ground (nm) = speed·hours (C3) |
| distance_tw_nm | double | No | distance through water (nm) (C3) |
| speed_og_kn | double | No | speed over ground / SOG (kn) (C4) |
| speed_tw_kn | double | No | speed through water / STW (kn) (C4) |
| me_rpm | double | No | main-engine RPM (C7) |
| me_shaft_power_kw | double | No | measured shaft power (kW) (C1) |
| me_foc_mt | double | No | ME fuel-oil consumption (t) (C2) |
| propeller_pitch_m | double | No | fixed-pitch propeller pitch (m) |
| fuel_type | string | No | at-sea fuel: `HFO` (scrubber vessels) / `VLSFO`; `MGO` in port |
| fuel_lcv_mj_kg | double | No | lower calorific value (MJ/kg) |
| ae_foc_mt | double | No | auxiliary-engine FOC (t) |
| boiler_foc_mt | double | No | boiler FOC (t) |
| total_foc_mt | double | No | total FOC = ME+AE+boiler (t) (C8) |
| draft_fore_m | double | No | forward draft (m) (C6) |
| draft_aft_m | double | No | aft draft (m) (C6) |
| mean_draft_m | double | No | mean draft = (fore+aft)/2 (m) (C5, C6) |
| trim_m | double | No | trim = aft − fore (m) (C6) |
| displacement_mt | double | No | displacement Δ from mass balance → hydrostatic (t) (C5) |
| cargo_weight_mt | double | No | cargo weight (t) |
| condition_flag | string | No | `laden` / `ballast` |
| wind_speed_kn | double | No | true wind speed (kn) |
| wind_dir_deg | double | No | wind direction (°) |
| beaufort | int | No | Beaufort number (C11) |
| wave_height_m | double | No | significant wave height Hs (m) (C11) |
| wave_dir_deg | double | No | wave direction (°) |
| wave_period_s | double | No | wave period (s) |
| swell_height_m | double | No | swell height (m) |
| swell_dir_deg | double | No | swell direction (°) |
| sea_water_temp_c | double | No | sea-water temperature (°C) |
| air_temp_c | double | No | air temperature (°C) |
| air_pressure_hpa | double | No | air pressure (hPa) |
| current_speed_kn | double | No | current speed (kn) (C4) |
| current_dir_deg | double | No | current direction (°) |
| sea_water_density_kg_m3 | double | No | sea-water density (kg/m³) (C11) |
| data_source | string | No | `sensor` |

```json
{"report_id": "NR-9700006-2023-01-01", "imo_number": "9700006", "vessel_name": "YM WELLNESS", "report_datetime_utc": "2023-01-01 12:00:00", "voyage_no": "1377", "leg": "KRPUS-NLRTM", "port_from": "KRPUS", "port_to": "NLRTM", "voyage_phase": "at_sea", "latitude": -60.0, "longitude": -115.0629, "heading_deg": 168.2397, "steaming_hours": 24.0, "distance_og_nm": 413.4125, "distance_tw_nm": 432.3379, "speed_og_kn": 17.3591, "speed_tw_kn": 18.0461, "me_rpm": 77.2897, "me_shaft_power_kw": 21409.3764, "me_foc_mt": 94.8735, "propeller_pitch_m": 8.0, "fuel_type": "VLSFO", "fuel_lcv_mj_kg": 41.0, "ae_foc_mt": 2.9132, "boiler_foc_mt": 1.5119, "total_foc_mt": 99.2985, "draft_fore_m": 13.427, "draft_aft_m": 12.603, "mean_draft_m": 13.015, "trim_m": -0.824, "displacement_mt": 141578.4202, "cargo_weight_mt": 88144.1068, "condition_flag": "laden", "wind_speed_kn": 25.1942, "wind_dir_deg": 136.4022, "beaufort": 6, "wave_height_m": 2.3193, "wave_dir_deg": 119.0958, "wave_period_s": 5.9777, "swell_height_m": 1.0521, "swell_dir_deg": 22.6473, "sea_water_temp_c": 10.0262, "air_temp_c": 10.9505, "air_pressure_hpa": 1011.983, "current_speed_kn": 0.8764, "current_dir_deg": 26.6252, "sea_water_density_kg_m3": 1027.0883, "data_source": "sensor"}
```

### 2.2 `vessel_master`

Grain: one row per vessel (dimension). Location:
`s3://<DataLakeBucket>/raw/vessel_master/vessel_master.jsonl`. Unpartitioned.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (key) |
| vessel_name | string | No | vessel name |
| vessel_type | string | No | `container` |
| fleet_id | string | No | operational fleet id (`FL-IA` / `FL-TP` / `FL-AE`) |
| fleet_name | string | No | operational fleet name (`Intra-Asia` / `Trans-Pacific` / `Asia-Europe`) |
| build_year | int | No | year built |
| lpp_m | double | No | length between perpendiculars (m) |
| breadth_m | double | No | moulded breadth B (m) |
| design_draft_m | double | No | design draft (m) |
| dwt | double | No | deadweight tonnage (t); CII capacity |
| gross_tonnage | double | No | gross tonnage |
| mcr_kw | double | No | maximum continuous rating (kW) |
| ncr_kw | double | No | normal continuous rating (kW) ≈ 0.85·MCR |
| design_speed_kn | double | No | design/contract speed Vdes (kn) |
| propeller_type | string | No | `FPP` (fixed-pitch propeller) |
| diameter_m | double | No | propeller diameter (m) |
| pitch_m | double | No | propeller pitch (m) |
| n_blades | int | No | number of propeller blades |
| transverse_area_m2 | double | No | transverse windage area A_XV (m²), for wind resistance |
| ref_curve_id | string | No | FK → `reference_curve.ref_curve_id` (`RC-<imo>`) |
| last_dry_dock_date | string | Yes | last dry-dock date; **null in raw** when unknown (`dim_vessel` fills it) |

```json
{"imo_number": "9700001", "vessel_name": "YM HARMONY", "vessel_type": "container", "fleet_id": "FL-IA", "fleet_name": "Intra-Asia", "build_year": 2012, "lpp_m": 150.0, "breadth_m": 23.0, "design_draft_m": 8.5, "dwt": 13500, "gross_tonnage": 9500, "mcr_kw": 9000, "ncr_kw": 7650, "design_speed_kn": 18.0, "propeller_type": "FPP", "diameter_m": 5.0, "pitch_m": 4.5, "n_blades": 4, "transverse_area_m2": 700.0, "ref_curve_id": "RC-9700001", "last_dry_dock_date": null}
```

**Fleet grouping (§21).** The 9 vessels are split into 3 operational fleets:
`FL-IA` Intra-Asia (9700001–3), `FL-TP` Trans-Pacific (9700004/5/8), `FL-AE`
Asia-Europe (9700006 WELLNESS / 9700007 / 9700009). The Dashboard fleet dropdown
scopes to one fleet; `agg_fleet_daily` carries a synthetic `ALL` rollup for the
whole fleet.

### 2.3 `reference_curve`

Grain: one row per vessel per sea-trial speed point (12 points/vessel,
0.5–1.05·Vdes at Δ_ref). Location:
`s3://<DataLakeBucket>/raw/reference_curve/reference_curve.jsonl`. Unpartitioned.
This clean-hull speed–power curve is the **single source of truth** shared by the
generator and the M2 ETL — sharing it is what makes injected speed loss
recoverable.

| Column | Type | Null? | Description |
|---|---|---|---|
| ref_curve_id | string | No | curve id `RC-<imo>` |
| imo_number | string | No | FK → vessel |
| speed_kn | double | No | speed point (kn) |
| shaft_power_kw | double | No | clean-hull shaft power at `speed_kn` and Δ_ref (kW) |
| displacement_ref_mt | double | No | reference displacement Δ_ref the curve is fitted at (t) |

```json
{"ref_curve_id": "RC-9700001", "imo_number": "9700001", "speed_kn": 9.0, "shaft_power_kw": 588.6409, "displacement_ref_mt": 19838.3625}
```

### 2.4 `uwi`

Grain: one row per underwater inspection. Location:
`s3://<DataLakeBucket>/raw/uwi/uwi.jsonl`. Unpartitioned. Inspection findings
track the true fouling state (C10: `hull_fouling_rating` correlates with true
speed loss).

| Column | Type | Null? | Description |
|---|---|---|---|
| inspection_id | string | No | `UWI-<imo>-<date>` |
| imo_number | string | No | FK → vessel |
| inspection_date | string | No | `YYYY-MM-DD` |
| inspection_type | string | No | `diver` / `ROV` / `UWI` |
| hull_fouling_rating | int | No | hull-fouling rating (higher = more fouled) |
| hull_fouling_coverage_pct | double | No | % of hull area fouled |
| propeller_condition | string | No | Rubert scale `A`–`F` (A = smoothest/best); banded from `propeller_roughness_um`: A[150,210) B[210,270) C[270,330) D[330,390) E[390,470) F[470,600] µm (polish onset C=270µm, repair onset E=390µm) |
| propeller_roughness_um | double | No | propeller surface roughness (µm); an independent, resettable process — not derived from hull fouling |
| coating_breakdown_pct | double | No | coating breakdown (% area), 0–100; an independent, resettable process — not derived from hull fouling |
| coating_condition | string | No | `good` / `fair` / `poor`; banded from `coating_breakdown_pct`: good <20 / fair [20,45) / poor ≥45 |
| recommended_action | string | No | `none` / `polish` / `clean` |

```json
{"inspection_id": "UWI-9700001-2021-09-18", "imo_number": "9700001", "inspection_date": "2021-09-18", "inspection_type": "diver", "hull_fouling_rating": 31, "hull_fouling_coverage_pct": 41.5888, "propeller_condition": "C", "propeller_roughness_um": 274.7663, "coating_breakdown_pct": 30.0, "coating_condition": "fair", "recommended_action": "polish"}
```

### 2.5 `maintenance_event`

Grain: one row per maintenance/event. Location:
`s3://<DataLakeBucket>/raw/maintenance_event/maintenance_event.jsonl`.
Unpartitioned. Only **`hull_cleaning` ∪ `dry_dock`** reset the fouling clock
(`days_since_cleaning`); the other event types do not.

| Column | Type | Null? | Description |
|---|---|---|---|
| event_id | string | No | `MV-<imo>-<date>-<type>` |
| imo_number | string | No | FK → vessel |
| event_date | string | No | `YYYY-MM-DD` |
| event_type | string | No | `hull_cleaning` / `propeller_polishing` / `dry_dock` / `coating_renewal` / `propeller_repair` / `engine_overhaul` |
| cost_usd | double | No | cash cost (USD) |
| downtime_hours | double | No | out-of-service hours (event full cost adds `downtime·$1000/h`) |
| location | string | No | port / yard |

```json
{"event_id": "MV-9700001-2023-11-25-dry_", "imo_number": "9700001", "event_date": "2023-11-25", "event_type": "dry_dock", "cost_usd": 763713.3099, "downtime_hours": 487.5134, "location": "Dubai"}
```

### 2.6 `fuel_price`

Grain: one row per day per fuel type (random walk). Location:
`s3://<DataLakeBucket>/raw/fuel_price/fuel_price.jsonl`. Unpartitioned. Joined by
`(date, fuel_type)` to price excess-fuel cost in M2.

| Column | Type | Null? | Description |
|---|---|---|---|
| date | string | No | `YYYY-MM-DD` |
| fuel_type | string | No | `HFO` / `VLSFO` / `MGO` |
| price_usd_per_mt | double | No | bunker price (USD/t) |

```json
{"date": "2021-07-01", "fuel_type": "HFO", "price_usd_per_mt": 482.5519}
```

---

## 3. Curated zone (M2)

The M2 ETL (`ym_datalake/etl/`) inverts the exact forward physics the generator
used — ISO 15016 sea-trial correction + ISO 19030 hull/propeller performance +
derived indicators — recovering the injected speed loss to the sensor-noise
floor (closed-loop C13). It reads only the raw zone (never `truth/`).

### 3.1 `fact_performance_daily`

Grain: one row per vessel per day (the main analytical table). Location:
`s3://<DataLakeBucket>/curated/fact_performance_daily/imo_number=<imo>/year=<yyyy>/month=<mm>/data.jsonl`.
Partitioned by **`imo_number`** (enum) + **`year`** (integer `2021,2026`) +
**`month`** (integer `1,12`, 2 digits) via projection. The body repeats
`imo_number`, `year`, `month` (ignored by Athena). The **ISO / derived** columns
are null on in-port days and on gross power outliers (corrected power ≤ 0);
`eeoi` is additionally null on ballast / zero-cargo days.

Formulas below are from `corrections.py`, `indicators.py`, `cii.py`; `s = speed_loss_pct/100`, `n = reference-curve exponent`.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| year | int | No | *(partition)* calendar year |
| month | int | No | *(partition)* calendar month |
| report_date | string | No | `YYYY-MM-DD` |
| vessel_name | string | No | vessel name |
| voyage_phase | string | No | `at_sea` / `in_port` |
| condition_flag | string | No | `laden` / `ballast` |
| latitude | double | No | position latitude (°), copied from the Noon Report; carried on **every** row (at-sea + in-port) so vessel tracks are continuous. **Decorative** — never feeds physics/CII (§3.1.2) |
| longitude | double | No | position longitude (°), copied from the Noon Report; carried on every row |
| port_from | string | No | departure UN/LOCODE (∈ `dim_port.locode`), copied from the Noon Report |
| port_to | string | No | arrival UN/LOCODE (∈ `dim_port.locode`), copied from the Noon Report |
| voyage_no | string | No | voyage number, copied from the Noon Report; FK → `fact_voyage.voyage_no` per `(imo_number, voyage_no)` |
| co2_mt | double | No | `total_foc · C_F[fuel]` (t); present in port too |
| days_since_cleaning | int | No | days since latest `hull_cleaning`/`dry_dock` (the union clock, `= min(days_since_dry_dock, days_since_in_water)`); first cycle anchored at window start |
| days_since_dry_dock | int | No | days since latest `dry_dock`; first cycle anchored at window start |
| days_since_in_water | int | No | days since latest `hull_cleaning` (in-water hull cleaning); first cycle anchored at window start |
| resistance_wind_kn | double | in-port | Blendermann wind added resistance R_AA (kN) |
| resistance_wave_kn | double | in-port | STAWAVE-1 wave added resistance R_AW (kN) |
| power_corrected_kw | double | in-port | `me_shaft_power_kw − ΔP_env` (wind+wave power removed) |
| speed_corrected_kn | double | in-port | `speed_tw_kn` (STW; current already removed) |
| v_expected_kn | double | in-port | `curve.clean_speed_kn(power_corrected, Δ)` — clean-hull expected speed |
| speed_loss_pct | double | in-port | `(v_expected − STW)/v_expected × 100` (+ = degradation) |
| slip_apparent | double | in-port | `(V_th − SOG)/V_th` (uses SOG) |
| slip_real | double | in-port | `(V_th − STW)/V_th` (uses STW) |
| sfoc_g_kwh | double | in-port | `me_foc · 1e6 / (me_power · hours)` (g/kWh) |
| admiralty_coef | double | in-port | `Δ^(2/3) · STW³ / me_power` |
| eeoi | double | in-port / ballast | `co2 · 1e6 / (cargo · distance_og)` (gCO₂/t·nm); null when cargo = 0 |
| excess_foc_mt | double | in-port | `me_foc · [1 − (1−s)^n]` — fuel wasted to fouling (t) |
| excess_cost_usd | double | in-port | `excess_foc × fuel_price(date, fuel_type)` |
| cum_excess_cost_usd | double | in-port | running Σ `excess_cost_usd` within the current fouling cycle |
| excess_cost_fouling_usd | double | in-port | fouling channel of the fuel penalty (= `excess_cost_usd`) |
| excess_cost_weather_usd | double | in-port | weather channel: fuel cost of wind+wave resistance power (`dp_env_kw`) |
| excess_cost_operational_usd | double | in-port | operational channel: off-design engine-load SFOC penalty |
| cii_aer | double | No | annual AER attained (gCO₂/dwt·nm), broadcast onto each day (§3.5) |
| cii_rating_aer | string | No | `A`–`E` against the base AER reference line |
| cii_imo | double | No | annual IMO attained (= AER for container ships) |
| cii_rating_imo | string | No | `A`–`E` against the year's reduced `required` line |
| anomaly_flag | boolean | No | M3: true if this (imo, date) was flagged |
| anomaly_cause | string | when unflagged | M3: `engine_degradation`/`propeller`/`weather`/`sensor` |
| anomaly_severity | string | when unflagged | M3: `low`/`medium`/`high` |
| valid_flag | boolean | No | ISO 19030 gate (§3.1.1) — eligible for trend/indicator fits |

**§3.x Weather attribution (additive).** The three `excess_cost_*_usd` channels
split the day's fuel penalty by physical source: `fouling` **equals** `excess_cost_usd`
(the ISO 19030 speed-loss penalty), `weather` is the fuel cost of the wind+wave
resistance the ISO 15016 correction removed, and `operational` is the off-design
engine-load SFOC penalty. They are **additive** (weather & operational are extra fuel
on top of fouling), so the deep-dive "excess-cost attribution" chart stacks them to a
total that **exceeds** the legacy `excess_cost_usd`. All three are co-null with
`excess_cost_usd` (null in port).

**ISO 19030 `valid_flag`** (`filters.py`): true when
`voyage_phase = at_sea` **and** steaming **and** `STW ≥ 0.5·V_design` **and**
`Beaufort ≤ 6` **and** `Δ ∈ [0.5, 1.2]·Δ_ref` **and** propulsion fields
finite/positive. Depth/rudder filters are N/A (raw carries neither); statistical
outlier rejection is M3, so a minority of injected sensor outliers still pass
`valid_flag`.

**§3.1.2 Positions are decorative.** `latitude`/`longitude`/`port_from`/`port_to`/
`voyage_no` are copied straight from the Noon Report and exist only to draw the
Fleet Map and per-vessel track (M6) and to roll up `fact_voyage` (§3.8). They
**never** feed the physics: fuel, CII, and ISO speed loss key off distance & speed,
never lat/lon (see `synthetic-dataset.md` §9). The sample row below predates the
Phase-1 columns; on a current dataset it also carries the five positional fields.

```json
{"imo_number": "9700006", "report_date": "2023-03-02", "year": 2023, "month": 3, "vessel_name": "YM WELLNESS", "voyage_phase": "at_sea", "condition_flag": "laden", "co2_mt": 594.4106, "days_since_cleaning": 294, "days_since_dry_dock": 294, "days_since_in_water": 609, "resistance_wind_kn": 304.5735, "resistance_wave_kn": 7.2253, "power_corrected_kw": 38392.0983, "speed_corrected_kn": 20.7254, "v_expected_kn": 21.5495, "speed_loss_pct": 3.824, "slip_apparent": 0.0852, "slip_real": 0.0993, "sfoc_g_kwh": 177.372, "admiralty_coef": 593.4715, "eeoi": 11.3147, "excess_foc_mt": 26.6063, "excess_cost_usd": 14197.2725, "cum_excess_cost_usd": 1322668.6233, "excess_cost_fouling_usd": 14197.2725, "excess_cost_weather_usd": 11105.121, "excess_cost_operational_usd": 183.4828, "cii_aer": 6.35, "cii_rating_aer": "C", "cii_imo": 6.35, "cii_rating_imo": "C", "anomaly_flag": false, "anomaly_cause": null, "anomaly_severity": null, "valid_flag": true}
```

### 3.2 `fact_performance_indicator`

Grain: one row per vessel per ISO 19030 period indicator (long format).
Location:
`s3://<DataLakeBucket>/curated/fact_performance_indicator/imo_number=<imo>/data.jsonl`.
Partitioned by **`imo_number`** (enum). Built over *valid* daily speed loss
(`periods.py`). The meaning of `value` / `reference_value` / `period_*` /
`event_*` / `detail` **depends on the `indicator` code**.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| indicator | string | No | `ISP` / `DDP` / `ME` / `MT` (see below) |
| period_start | string | ISP only | period start `YYYY-MM-DD` |
| period_end | string | ISP, DDP | period end `YYYY-MM-DD` |
| event_type | string | ME, DDP | maintenance event type the row is keyed to |
| event_date | string | ME, DDP, MT | event / crossing date |
| value | double | Yes | the indicator's value (per code below) |
| reference_value | double | ISP, ME, DDP | the indicator's baseline (per code below) |
| detail | string | ME, MT | free-text detail |

Per-code semantics:

| Code | Meaning | `value` | `reference_value` | Other |
|---|---|---|---|---|
| **ISP** | In-service performance: per-cycle mean speed loss vs the first cycle | cycle mean speed_loss_pct | first cycle's mean | `period_start`/`period_end` = cycle bounds |
| **DDP** | Dry-dock performance: mean speed loss in the ±45-day window around a dry dock | mean speed loss in 45 d **after** | mean speed loss in 45 d **before** | `event_type=dry_dock`, `event_date`, `period_end`=date+45 d |
| **ME** | Maintenance effect: recovery at one event (before − after, ±30 d) | before − after (+ = recovered) | before-window mean | `event_type`, `event_date`, `detail="after=<x>"` |
| **MT** | Maintenance trigger: first date the 14-day trailing-mean speed loss crosses the trigger | `8.0` (the threshold) | null | `event_date`=crossing date, `detail="trailing-mean speed loss crossed trigger"` |

```json
{"imo_number": "9700006", "indicator": "ISP", "period_start": "2021-07-01", "period_end": "2022-05-12", "event_type": null, "event_date": null, "value": 3.3379, "reference_value": 3.3379, "detail": null}
```

### 3.3 `fact_uwi`

Grain: one row per underwater inspection (pass-through of raw `uwi`, minus the
`imo_number` body key which becomes the partition). Location:
`s3://<DataLakeBucket>/curated/fact_uwi/imo_number=<imo>/data.jsonl`. Partitioned
by **`imo_number`** (enum).

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| inspection_id | string | No | `UWI-<imo>-<date>` |
| inspection_date | string | No | `YYYY-MM-DD` |
| inspection_type | string | No | `diver` / `ROV` / `UWI` |
| hull_fouling_rating | int | No | hull-fouling rating (higher = more fouled) |
| hull_fouling_coverage_pct | double | No | % of hull area fouled |
| propeller_condition | string | No | Rubert scale `A`–`F` (A best); banded from `propeller_roughness_um`: A[150,210) B[210,270) C[270,330) D[330,390) E[390,470) F[470,600] µm |
| propeller_roughness_um | double | No | propeller roughness (µm); independent, resettable process — not derived from hull fouling |
| coating_breakdown_pct | double | No | coating breakdown (% area), 0–100; independent, resettable process |
| coating_condition | string | No | `good` / `fair` / `poor`; banded from `coating_breakdown_pct`: good <20 / fair [20,45) / poor ≥45 |
| recommended_action | string | No | `none` / `polish` / `clean` |

```json
{"inspection_id": "UWI-9700006-2021-10-06", "imo_number": "9700006", "inspection_date": "2021-10-06", "inspection_type": "UWI", "hull_fouling_rating": 16, "hull_fouling_coverage_pct": 21.7, "propeller_condition": "B", "propeller_roughness_um": 215.1, "coating_breakdown_pct": 8.0, "coating_condition": "good", "recommended_action": "none"}
```

### 3.4 `fact_maintenance_event`

Grain: one row per maintenance event (pass-through of raw `maintenance_event`
plus two M3-filled effect columns). Location:
`s3://<DataLakeBucket>/curated/fact_maintenance_event/imo_number=<imo>/data.jsonl`.
Partitioned by **`imo_number`** (enum). `me_recovery_pct` / `payback_days` are
emitted null by M2 and **filled by M3** (`recommendation.py`).

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| event_id | string | No | `MV-<imo>-<date>-<type>` |
| event_date | string | No | `YYYY-MM-DD` |
| event_type | string | No | `hull_cleaning` / `propeller_polishing` / `dry_dock` / `coating_renewal` / `propeller_repair` / `engine_overhaul` |
| cost_usd | double | No | cash cost (USD) |
| downtime_hours | double | No | out-of-service hours |
| location | string | No | port / yard |
| me_recovery_pct | double | Yes | M3: `ME.value / ME.reference_value × 100` = (before−after)/before × 100; can be negative; null if no ME row |
| payback_days | double | Yes | M3: event full cost ÷ daily excess-cost saving (±30 d); null if window empty or saving ≤ 0 |

```json
{"event_id": "MV-9700006-2022-05-12-dry_", "imo_number": "9700006", "event_date": "2022-05-12", "event_type": "dry_dock", "cost_usd": 1425326.009, "downtime_hours": 390.2169, "location": "Colombo", "me_recovery_pct": 95.1563, "payback_days": 130.5487}
```

### 3.5 `dim_vessel`

Grain: one row per vessel. Location:
`s3://<DataLakeBucket>/curated/dim_vessel/dim_vessel.jsonl`. Unpartitioned.
**Identical schema to raw `vessel_master`**, but `last_dry_dock_date` is filled
from the vessel's latest `dry_dock` event (raw often leaves it null).

Columns: same 21 as `vessel_master` (§2.2), including `fleet_id` / `fleet_name`
(the roster the Dashboard fleet dropdown filters on). Only `last_dry_dock_date`
nullability differs in practice — populated here.

```json
{"imo_number": "9700006", "vessel_name": "YM WELLNESS", "vessel_type": "container", "fleet_id": "FL-AE", "fleet_name": "Asia-Europe", "build_year": 2016, "lpp_m": 330.0, "breadth_m": 48.0, "design_draft_m": 15.5, "dwt": 128000, "gross_tonnage": 113000, "mcr_kw": 62000, "ncr_kw": 52700, "design_speed_kn": 23.0, "propeller_type": "FPP", "diameter_m": 9.2, "pitch_m": 8.0, "n_blades": 6, "transverse_area_m2": 2800.0, "ref_curve_id": "RC-9700006", "last_dry_dock_date": "2022-05-12"}
```

### 3.6 `dim_reference_curve`

Grain: one row per vessel per speed point (pass-through of raw `reference_curve`).
Location: `s3://<DataLakeBucket>/curated/dim_reference_curve/dim_reference_curve.jsonl`.
Unpartitioned. Columns: same 5 as `reference_curve` (§2.3). Used with
`fact_performance_daily` for speed–power scatter plots.

```json
{"ref_curve_id": "RC-9700001", "imo_number": "9700001", "speed_kn": 9.0, "shaft_power_kw": 588.6409, "displacement_ref_mt": 19838.3625}
```

### 3.7 `agg_fleet_daily`

Grain: one row per **(fleet, day)**. Location:
`s3://<DataLakeBucket>/curated/agg_fleet_daily/agg_fleet_daily.jsonl`.
Unpartitioned — `fleet_id`/`year`/`month` are ordinary body columns here, **not**
partition keys. `n_alerts` is emitted null by M2 and **filled by M3**. Each date
has a synthetic **`fleet_id='ALL'` rollup row** (over the whole fleet — identical
to the historical single-grain aggregate) **plus one row per sub-fleet**
(`FL-IA`/`FL-TP`/`FL-AE`). The Dashboard `fleet_overview` query defaults to
`fleet_id='ALL'`; the fleet dropdown passes a sub-fleet id.

| Column | Type | Null? | Description |
|---|---|---|---|
| fleet_id | string | No | `ALL` (all-fleet rollup) or a sub-fleet (`FL-IA`/`FL-TP`/`FL-AE`) |
| report_date | string | No | `YYYY-MM-DD` |
| year | int | No | calendar year (body column) |
| month | int | No | calendar month (body column) |
| n_vessels | int | No | vessels reporting that day (in the fleet) |
| avg_speed_loss_pct | double | Yes | mean of valid daily `speed_loss_pct` across the fleet |
| total_excess_cost_usd | double | Yes | Σ `excess_cost_usd` across the fleet |
| cii_count_a | int | No | # vessels rated CII A that day |
| cii_count_b | int | No | # vessels rated CII B |
| cii_count_c | int | No | # vessels rated CII C |
| cii_count_d | int | No | # vessels rated CII D |
| cii_count_e | int | No | # vessels rated CII E |
| n_alerts | int | No | M3: # flagged rows across the fleet that day |

```json
{"fleet_id": "ALL", "report_date": "2021-07-01", "year": 2021, "month": 7, "n_vessels": 9, "avg_speed_loss_pct": 5.2652, "total_excess_cost_usd": 110240.0158, "cii_count_a": 2, "cii_count_b": 2, "cii_count_c": 1, "cii_count_d": 1, "cii_count_e": 3, "n_alerts": 0}
{"fleet_id": "FL-AE", "report_date": "2021-07-01", "year": 2021, "month": 7, "n_vessels": 3, "avg_speed_loss_pct": 4.9388, "total_excess_cost_usd": 57549.9189, "cii_count_a": 0, "cii_count_b": 1, "cii_count_c": 1, "cii_count_d": 0, "cii_count_e": 1, "n_alerts": 0}
```

> **Always filter `fleet_id`** (e.g. `WHERE fleet_id='ALL'`) — otherwise every
> query double-counts the rollup against its sub-fleets.

**CII computation** (`cii.py`, annual, broadcast onto each day of the year).
Container ships use Capacity = DWT, so AER and full-IMO attained coincide; they
differ only in the rating reference line:

```
attained = Σ_year(total_foc · C_F) · 1e6 / (DWT · Σ_year distance_og)   # gCO2/dwt·nm
CII_ref  = a · DWT^(−c)                     # a = 1984, c = 0.489 (MEPC.353, container)
required = (1 − Z%_year) · CII_ref          # Z%: 2023→5, 2024→7, 2025→9, 2026→11
rating   = A–E via dd vector (0.83, 0.94, 1.07, 1.19)   # MEPC.354, container
```

`cii_rating_aer` rates against `CII_ref` (base); `cii_rating_imo` against the
year's reduced `required` line.

### 3.8 `fact_voyage`

Grain: one row per **(imo_number, voyage_no)** — one port-rotation leg **incl. its
in-port day** (the voyage the vessel is on between two ports). Location:
`s3://<DataLakeBucket>/curated/fact_voyage/imo_number=<imo>/data.jsonl`. Partitioned
by **`imo_number`** (enum). Built by `ym_datalake/etl/voyages.py::build_voyages`,
which groups the Noon Report by `(imo, voyage_no)` and rolls it up. Distance / FOC /
CO₂ **sum the raw daily values**, so the per-vessel energy balance is exact (**C18**,
curated-dataset §7). Powers the Deep-dive sortable voyage-economics table.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| voyage_no | string | No | voyage number (the rotation leg id) |
| vessel_name | string | No | vessel name |
| from_port | string | No | departure UN/LOCODE (∈ `dim_port.locode`) = the leg's `port_from` |
| to_port | string | No | arrival UN/LOCODE (∈ `dim_port.locode`) = the leg's `port_to` |
| depart_date | string | No | min `report_date` of the group `YYYY-MM-DD` |
| arrive_date | string | No | max `report_date` of the group `YYYY-MM-DD` |
| distance_nm | double | No | Σ raw `distance_og_nm` over all rows |
| sea_days | int | No | count of at-sea rows in the voyage |
| avg_speed_kn | double | zero-steaming | `distance_nm / Σ steaming_hours` |
| total_foc_mt | double | No | Σ raw `total_foc_mt` over **all** rows (at-sea + in-port) → makes C18 exact |
| fuel_cost_usd | double | No | Σ (`total_foc_mt` × `fuel_price(date, fuel_type)`), each day priced by its own fuel type |
| co2_mt | double | No | Σ daily `co2_mt` keyed by `(imo, date)` — reconciles with `fact_performance_daily` |
| avg_speed_loss_pct | double | no-valid-days | mean of the at-sea daily non-null `speed_loss_pct` |
| usd_per_nm | double | zero distance | `fuel_cost_usd / distance_nm` |
| on_time_flag | boolean | No | `(arrive − depart).days ≤ planned days` |
| planned_eta | string | No | `depart + round(path_nm / (0.85 · design_speed · 24))` days; service speed = 85 % of design (Vdes derate) → ~half the voyages on-time |

```json
{"imo_number": "9700006", "voyage_no": "1377", "vessel_name": "YM WELLNESS", "from_port": "CNSHA", "to_port": "SGSIN", "depart_date": "2023-01-01", "arrive_date": "2023-01-06", "distance_nm": 2059.7314, "sea_days": 5, "avg_speed_kn": 17.1644, "total_foc_mt": 512.3401, "fuel_cost_usd": 315480.51, "co2_mt": 1614.39, "avg_speed_loss_pct": 3.824, "usd_per_nm": 153.1663, "on_time_flag": false, "planned_eta": "2023-01-05"}
```

> The `planned_eta` derate (85 % of design speed) is the **only** place a
> voyage touches geography: the planned duration comes from the bent great-circle
> `route_path` length (`ports.py`), not the vessel's actual noon positions. Actual
> distance / FOC / CO₂ still key off the reported daily values.

### 3.9 `dim_port`

Grain: one row per **port** (flat dimension). Location:
`s3://<DataLakeBucket>/curated/dim_port/dim_port.jsonl`. Unpartitioned (10 rows).
Rows come straight from `synthetic_data/ports.py::PORTS`. Ships as a Glue table for
**server-side joins** (e.g. `fact_voyage.from_port` → `dim_port.locode`), unlocking
the Phase 3 EU-scope-from-ports work via `is_eu`. **Note:** the Dashboard map reads
coordinates from `web/ports.js` (a static mirror), **not** from `dim_port` —
`dim_port` is for Athena / server-side use.

| Column | Type | Null? | Description |
|---|---|---|---|
| locode | string | No | UN/LOCODE (key), e.g. `SGSIN`, `NLRTM` |
| name | string | No | port name |
| lat | double | No | port latitude (°) |
| lon | double | No | port longitude (°) |
| is_eu | boolean | No | EU port? true **only** for `NLRTM` (Rotterdam) and `DEHAM` (Hamburg) |

```json
{"locode": "SGSIN", "name": "Singapore", "lat": 1.27, "lon": 103.83, "is_eu": false}
{"locode": "NLRTM", "name": "Rotterdam", "lat": 51.95, "lon": 4.14, "is_eu": true}
```

The 10 LOCODEs are `SGSIN`, `NLRTM`, `KRPUS`, `CNSHA`, `LKCMB`, `AEDXB`, `USLAX`,
`DEHAM`, `JPTYO`, `HKHKG` (real coordinates); see `synthetic-dataset.md` §9.

### 3.10 `fact_speed_profile`

Grain: one row per **(imo_number, speed_kn)** — **24** speed-grid points per vessel
spanning **0.5 → 1.0 of design speed**. Location:
`s3://<DataLakeBucket>/curated/fact_speed_profile/imo_number=<imo>/data.jsonl`.
Partitioned by **`imo_number`** (enum). Built by
`ym_datalake/etl/optimize.py::build_speed_profiles` (curated M2, **Phase 2**): for
each vessel it sweeps the reference speed–power curve at the reference
displacement, inflates the clean power by the **latest** fouling state
(`P_fouled = P_clean / (1 − s)^n`, `s` = latest valid `speed_loss_pct/100`,
`n` = `curve_n`), prices the fouled fuel burn at the latest bunker price, and adds
the vessel's per-day **charter (hire) cost**. The resulting `usd_per_nm` is
**convex** — the fuel-only unit cost rises monotonically with speed (a degenerate
min at the slowest grid point), so the per-day time cost is what creates an
interior *economical speed*: `recommended_speed_kn` = the `usd_per_nm` argmin,
strictly interior to the grid (**C19**, curated-dataset §7). Deterministic — no
RNG, no ground truth (additive to M2/M3, so C1–C18 are untouched). Powers the
Optimizer page (`vessel_speed_profile`).

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| speed_kn | double | No | grid speed (kn); 24 points, `0.5·V_design … 1.0·V_design` |
| shaft_power_kw | double | No | clean-hull shaft power at this speed and the reference displacement (`curve.clean_power_kw`) |
| foc_mt_per_day | double | No | fouling-inflated daily fuel burn `physics.foc_mt(P_fouled, sfoc, 24)` (mt/day) |
| co2_mt_per_day | double | No | `foc_mt_per_day × carbon_factor(fuel_type)` (mt/day) |
| fuel_usd_per_day | double | No | `foc_mt_per_day × latest bunker price` (USD/day) |
| charter_usd_per_day | double | No | per-vessel charter/hire rate (USD/day); static `VesselSpec` particular — the time cost. **Not** in `dim_vessel`/`vessel_master` |
| usd_per_day | double | No | `fuel_usd_per_day + charter_usd_per_day` (USD/day, total) |
| usd_per_nm | double | No | **total** unit-distance cost `usd_per_day / (speed_kn·24)` — convex, min = economical speed |
| fuel_usd_per_nm | double | No | fuel-only unit-distance cost `fuel_usd_per_day / (speed_kn·24)` — strictly increasing (decomposition) |
| vessel_name | string | No | vessel name *(repeated on every grid row)* |
| recommended_speed_kn | double | No | economical speed = `usd_per_nm` argmin (interior, C19) *(repeated)* |
| current_speed_kn | double | Yes | latest valid `speed_corrected_kn` (kn) *(repeated; null if no valid at-sea point)* |
| annual_distance_nm | double | No | Σ daily `distance_og_nm` annualised over the noon date span (nm/yr) *(repeated)* |

```json
{"imo_number": "9700006", "speed_kn": 11.5, "shaft_power_kw": 3293.75, "foc_mt_per_day": 19.5287, "co2_mt_per_day": 61.5348, "fuel_usd_per_day": 11058.2466, "charter_usd_per_day": 101000.0, "usd_per_day": 112058.2466, "usd_per_nm": 406.0081, "fuel_usd_per_nm": 40.0661, "vessel_name": "YM WELLNESS", "recommended_speed_kn": 15.0, "current_speed_kn": 17.2317, "annual_distance_nm": 141202.5669}
```

13 body columns + 1 partition key. The four vessel-level fields (`vessel_name`,
`recommended_speed_kn`, `current_speed_kn`, `annual_distance_nm`) are **identical
on all 24 rows** of a vessel (same trick as `fact_voyage.vessel_name`); filter
`speed_kn = recommended_speed_kn` to pull one economical-speed row per vessel.

> `charter_usd_per_day` is the **only** non-physics input — a static `VesselSpec`
> per-day hire rate, not derived from any daily / noon value. It is what bends the
> monotone fuel-only `fuel_usd_per_nm` into a **convex** total `usd_per_nm` with an
> interior minimum; drop it and the argmin degenerates to the slowest grid point
> (a C19 boundary failure).

---

## 4. Curated zone (M3 — statistical insight)

M3 (`compute.py::_apply_m3`, per vessel) adds a statistical layer over M2:
a piecewise fouling-rate trend (`trends.py`), point-anomaly detection with
rule-based cause + severity (`anomaly.py`), a maintenance-effect + optimal-
cleaning recommendation (`recommendation.py`), and an early-warning alert-episode
layer (`alerts.py`). It emits the new `fact_anomaly`, `fact_recommendation`,
`fact_maintenance_recommendation` and `fact_alert` tables and fills the M2 null
stubs (`fact_performance_daily.anomaly_*`,
`fact_maintenance_event.me_recovery_pct`/`payback_days`, `agg_fleet_daily.n_alerts`).

> **Biofouling is a trend slope, never a point-anomaly cause.** The anomaly
> cause set is `{engine_degradation, propeller, weather, sensor}`; gradual hull
> fouling shows up as the segment slope, not a flag.

### 4.1 `fact_anomaly`

Grain: one row per flagged `(imo, date)`, emitted at the **driver metric** — the
channel with the largest global residual z-score. Location:
`s3://<DataLakeBucket>/curated/fact_anomaly/imo_number=<imo>/data.jsonl`.
Partitioned by **`imo_number`** (enum).

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| report_date | string | No | flagged day `YYYY-MM-DD` |
| metric | string | No | driver channel: `speed_loss` / `slip` / `sfoc` / `excess_foc` |
| value | double | No | that channel's observed value on the flagged day |
| z_score | double | No | global (MAD) residual z-score of the driver channel |
| severity | string | No | `low` / `medium` / `high` |
| cause | string | No | `engine_degradation` / `propeller` / `weather` / `sensor` |

```json
{"imo_number": "9700006", "report_date": "2021-12-17", "metric": "sfoc", "value": 187.5096, "z_score": 1.1714, "severity": "medium", "cause": "weather"}
```

### 4.2 `fact_recommendation`

Grain: one row per vessel (flat — `imo_number` is a body column here, **not** a
partition). Location:
`s3://<DataLakeBucket>/curated/fact_recommendation/fact_recommendation.jsonl`.
Unpartitioned. Fits the open cycle's daily excess-cost rate and minimises the
cycle cost rate in closed form (`recommendation.py`): `c(t)=α+β·t`,
`J(T)=K/T+α+β·T/2`, `T*=√(2K/β)`; `K` = median hull-cleaning full cost (falling
back to the fleet median).

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (body column) |
| last_cleaning_date | string | No | reconstructed last `hull_cleaning`/`dry_dock` reset |
| recommended_clean_date | string | Yes | `last_cleaning + round(T*)` |
| trigger_eta | string | Yes | date the open cycle reaches **8 %** speed loss (null if slope ≤ 0) |
| t_star_days | double | Yes | `T* = √(2K/β)` — cost-rate-minimising cycle length (days) |
| fouling_rate_pct_per_day | double | Yes | open-cycle segment slope (%/day) |
| net_saving_usd | double | Yes | `∫_{T*}^{trigger}(c(t) − J*) dt` — saving vs cleaning at the trigger; null unless a trigger ETA exists beyond T* |
| status | string | No | `ok` / `insufficient_history` (degeneracy: <30 priced points, β ≤ 0, CI straddles 0, or no K) |

```json
{"imo_number": "9700006", "last_cleaning_date": "2025-01-15", "recommended_clean_date": "2025-03-30", "trigger_eta": "2026-11-26", "t_star_days": 74.0, "fouling_rate_pct_per_day": 0.012, "net_saving_usd": 5400000.0, "status": "ok"}
```

`fact_performance_daily.anomaly_*` (§3.1) and `fact_maintenance_event`'s
`me_recovery_pct`/`payback_days` (§3.4) and `agg_fleet_daily.n_alerts` (§3.7)
are the other columns M3 fills.

### 4.3 `fact_maintenance_recommendation`

Grain: one row per (vessel, recommended action) where action is needed (flat —
`imo_number` is a body column, **not** a partition; a vessel with nothing due has
**no rows**). Location:
`s3://<DataLakeBucket>/curated/fact_maintenance_recommendation/fact_maintenance_recommendation.jsonl`.
Unpartitioned. Broadens the hull-cleaning-only `fact_recommendation` into overall
maintenance actions via a cause→action decision table (`recommendation.py`,
`recommend_actions`) over the latest `fact_uwi` condition, trailing `fact_anomaly`
causes (counted over the last **180 days**), and the fouling cost model
(`fact_recommendation`). **Every action now carries a predictive `due_date`** —
the forecast crossing date of its degradation threshold (Theil-Sen fit over the
action's reset clock: propeller polish → 300µm, repair → 430µm, coating renewal →
45%, engine inspection → +5% SFOC efficiency loss), bounded to the priority
window, else a priority-horizon fallback (high +30 d / medium +90 d);
`hull_cleaning` uses `fact_recommendation.recommended_clean_date` when it is still
future, else (overdue) the 8% trigger deadline / horizon. Effectively never null.
**Every action also carries the same 4-metric analytics as hull cleaning** —
`degradation_rate`/`degradation_unit`, `current_value`/`threshold_value`,
`trigger_eta`, and (economic actions) `t_star_days`/`net_saving_usd`.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (body column) |
| action_type | string | No | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| priority | string | No | `high` / `medium` / `low` |
| due_date | string | No | `YYYY-MM-DD`; forecast threshold-crossing date bounded to the priority window, else a priority-horizon fallback (high +30 d / medium +90 d); `hull_cleaning` uses `fact_recommendation.recommended_clean_date` when still future, else (overdue) the 8% trigger deadline / horizon. Effectively never null |
| rationale | string | No | short English evidence string (UWI grade, anomaly count, cost-model date) |
| source | string | No | `uwi` / `anomaly` / `fouling_model` / `sfoc_trend` / `uwi+anomaly` (evidence stream(s) that triggered it) |
| degradation_rate | double | Yes | Theil-Sen slope of the action's degradation signal (per day); null when too thin to fit |
| degradation_unit | string | Yes | unit of `degradation_rate`: `%/day` (hull/coating/engine) or `µm/day` (propeller) |
| current_value | double | Yes | latest signal value for context (speed loss %, roughness µm, breakdown %, SFOC drift %) |
| threshold_value | double | Yes | action threshold: 8 (hull), 300/430 (propeller polish/repair µm), 45 (coating %), 5 (engine %) |
| trigger_eta | string | Yes | `YYYY-MM-DD` forecast date the signal reaches `threshold_value` (null when flat/declining) |
| t_star_days | double | Yes | optimal service interval (days) minimising total cost; economic actions only |
| net_saving_usd | double | Yes | saved cost of servicing at `t*` vs waiting to the threshold; economic actions only, > 0 when set |
| plan_date | string | Yes | `YYYY-MM-DD` planned service date of the batched **window** this action belongs to (the consolidated "next maintenance date"); shared by every action in the window |
| plan_service_type | string | Yes | `dry_dock` / `in_water` — whether the window needs a haul-out; shared by every action in the window |

**Consolidated planner** — `recommendation.plan_maintenance` (run at the tail of
`recommend_actions`) batches the scattered per-action due dates into shared service
windows: dry-dock actions (`coating_renewal` / `propeller_repair`) anchor a window on
their earliest due; in-water actions (`hull_cleaning` / `propeller_polishing` /
`engine_inspection`) fold into the nearest dry-dock window within ±60 days, else batch
among themselves. Each row is tagged with its window's `plan_date` (earliest constraining
due) + `plan_service_type` (`dry_dock` if the window holds any dry-dock action, else
`in_water`); the Dashboard groups the flat rows by `plan_date`. See the
`fact_maintenance_recommendation` skill doc for the full batching algorithm.

Each action carries the same 4-metric analytics as hull cleaning (degradation rate,
threshold ETA, and — for economic actions — optimal service interval `t*` + net
saving); the `hull_cleaning` row **self-carries** its `fact_recommendation` cost
model. Economics: hull/engine are data-driven; propeller/coating scale a documented
POC penalty coefficient (excess-power fraction per signal unit) — see the
`fact_maintenance_recommendation` skill doc.

```json
{"imo_number": "9700006", "action_type": "hull_cleaning", "priority": "high", "due_date": "2025-03-30", "rationale": "fouling cost model recommends cleaning by 2025-03-30; 8% speed-loss trigger ETA 2026-11-26", "source": "fouling_model", "degradation_rate": 0.041, "degradation_unit": "%/day", "current_value": 9.13, "threshold_value": 8.0, "trigger_eta": "2026-11-26", "t_star_days": 90.0, "net_saving_usd": 97231.6, "plan_date": "2025-03-30", "plan_service_type": "in_water"}
{"imo_number": "9700006", "action_type": "propeller_polishing", "priority": "medium", "due_date": "2025-06-15", "rationale": "propeller condition Rubert C; 2 anomalies caused by propeller fouling in 180d", "source": "uwi+anomaly", "degradation_rate": 0.63, "degradation_unit": "µm/day", "current_value": 362.0, "threshold_value": 300.0, "trigger_eta": "2025-06-15", "t_star_days": 166.0, "net_saving_usd": 2852.6, "plan_date": "2025-06-15", "plan_service_type": "in_water"}
```

### 4.4 `fact_alert`

Grain: one row per **open alert episode** `(imo, cause, opened_date)`. Location:
`s3://<DataLakeBucket>/curated/fact_alert/imo_number=<imo>/data.jsonl`. Partitioned
by **`imo_number`** (enum). A promotion / narration layer (`alerts.py`) over the
point facts — it runs no new detection. Two sources: **point-anomaly episodes**
(consecutive same-`cause` `fact_anomaly` days collapsed with a **7-day** gap
tolerance; `source=anomaly`) and the **hull-biofouling trend** (from
`fact_recommendation`'s positive fouling rate + trigger ETA and the trailing-14-day
speed loss vs the 8 % trigger; `source=fouling_model`). Biofouling is a
*cause here* even though it is deliberately **never** a `fact_anomaly` point cause.
Backs the Dashboard `fleet_alerts` / `vessel_alerts` feeds + the Fleet Overview
"Active alerts" KPI.

| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number |
| alert_id | string | No | `AL-<imo>-<opened_date>-<cause>` (unique per episode) |
| fleet_id | string | No | operational fleet (`FL-IA`/`FL-TP`/`FL-AE`) |
| opened_date | string | No | episode start `YYYY-MM-DD` (biofouling: cleaning-cycle start) |
| last_seen_date | string | No | most recent flagged day (biofouling: latest report date) |
| cause | string | No | `hull_biofouling`/`propeller`/`engine_degradation`/`weather`/`sensor` |
| severity | string | No | `low`/`medium`/`high` (episode peak) |
| driver_metric | string | No | `speed_loss`/`slip`/`sfoc`/`excess_foc` (biofouling = `speed_loss`) |
| peak_value | double | Yes | driver value at the peak (biofouling: trailing-14d speed loss %) |
| peak_z | double | Yes | peak residual z-score (**null for biofouling** — a trend, not a z) |
| excess_cost_usd | double | Yes | window excess fuel cost (biofouling: cumulative cycle penalty) |
| recommended_action | string | No | bilingual `中文 (English)` recommended action |
| status | string | No | `open` (only value emitted; ack is Dashboard-local) |
| source | string | No | `anomaly` (point episode) / `fouling_model` (biofouling trend) |
| message_zh | string | No | 中文 narrative |
| message_en | string | No | English narrative |

```json
{"imo_number": "9700006", "alert_id": "AL-9700006-2021-07-03-weather", "fleet_id": "FL-AE", "opened_date": "2021-07-03", "last_seen_date": "2021-07-03", "cause": "weather", "severity": "medium", "driver_metric": "speed_loss", "peak_value": 2.5432, "peak_z": 1.3037, "excess_cost_usd": 4467.0161, "recommended_action": "持續監控，與海氣象相關 (Monitor; weather-related)", "status": "open", "source": "anomaly", "message_zh": "惡劣海氣象：1 天異常（2021-07-03–2021-07-03），峰值 z=1.3，估計燃油損失 $4,467", "message_en": "Heavy weather: 1 anomaly-day (2021-07-03–2021-07-03), peak z=1.3, est. excess fuel $4,467"}
{"imo_number": "9700006", "alert_id": "AL-9700006-2025-01-15-hull_biofouling", "fleet_id": "FL-AE", "opened_date": "2025-01-15", "last_seen_date": "2026-06-30", "cause": "hull_biofouling", "severity": "medium", "driver_metric": "speed_loss", "peak_value": 6.0045, "peak_z": null, "excess_cost_usd": 4031011.4957, "recommended_action": "規劃船體清潔 (Plan hull cleaning)", "status": "open", "source": "fouling_model", "message_zh": "船體生物附著：速度損失趨勢上升，近 14 日平均 6.0%（門檻 8%），預估 2026-11-27 觸發，UWI 汙損等級 32，本週期燃油損失 $4,031,011", "message_en": "Hull biofouling: speed loss trending up, 14-day mean 6.0% (trigger 8%), est. trigger 2026-11-27, UWI fouling rating 32, cycle excess fuel $4,031,011"}
```

---

## 5. Enum / domain reference

Allowed values, confirmed against the generator/ETL source and the distinct
values actually present in `tmp/` (`--seed 42`).

| Column(s) | Table(s) | Allowed values |
|---|---|---|
| `voyage_phase` | noon_report, fact_performance_daily | `at_sea`, `in_port` ¹ |
| `condition_flag` | noon_report, fact_performance_daily | `laden`, `ballast` |
| `fuel_type` | noon_report | `HFO` (scrubber vessels 9700003/9700009 at sea), `VLSFO` (others at sea), `MGO` (in port) |
| `fuel_type` | fuel_price | `HFO`, `VLSFO`, `MGO` |
| `data_source` | noon_report | `sensor` |
| `event_type` | maintenance_event, fact_maintenance_event | `hull_cleaning`, `propeller_polishing`, `dry_dock`, `coating_renewal`, `propeller_repair`, `engine_overhaul` ² |
| `inspection_type` | uwi, fact_uwi | `diver`, `ROV`, `UWI` |
| `propeller_condition` | uwi, fact_uwi | `A`, `B`, `C`, `D`, `E`, `F` (Rubert scale; A best) |
| `coating_condition` | uwi, fact_uwi | `good`, `fair`, `poor` (banded from `coating_breakdown_pct`: good <20 / fair [20,45) / poor ≥45) |
| `recommended_action` | uwi, fact_uwi | `none`, `polish`, `clean` |
| `cii_rating_aer`, `cii_rating_imo` | fact_performance_daily | `A`, `B`, `C`, `D`, `E` |
| `indicator` | fact_performance_indicator | `ISP`, `DDP`, `ME`, `MT` |
| `event_type` | fact_performance_indicator | `dry_dock`, `hull_cleaning`, `propeller_polishing`, `coating_renewal`, or null (ISP/MT rows) |
| `metric` | fact_anomaly | `speed_loss`, `slip`, `sfoc`, `excess_foc` |
| `driver_metric` | fact_alert | `speed_loss`, `slip`, `sfoc`, `excess_foc` |
| `cause` | fact_anomaly, fact_performance_daily | `engine_degradation`, `propeller`, `weather`, `sensor` |
| `cause` | fact_alert | `hull_biofouling`, `propeller`, `engine_degradation`, `weather`, `sensor` (biofouling **only** here) |
| `severity` | fact_anomaly, fact_performance_daily, fact_alert | `low`, `medium`, `high` |
| `status` | fact_recommendation | `ok`, `insufficient_history` ³ |
| `status` | fact_alert | `open` (only value; ack is Dashboard-local) |
| `action_type` | fact_maintenance_recommendation | `hull_cleaning`, `propeller_polishing`, `propeller_repair`, `coating_renewal`, `engine_inspection` |
| `priority` | fact_maintenance_recommendation | `high`, `medium`, `low` |
| `source` | fact_maintenance_recommendation | `uwi`, `anomaly`, `fouling_model`, `sfoc_trend`, `uwi+anomaly` |
| `source` | fact_alert | `anomaly` (point episode), `fouling_model` (biofouling trend) |
| `fleet_id` | vessel_master, dim_vessel | `FL-IA`, `FL-TP`, `FL-AE` |
| `fleet_id` | agg_fleet_daily | `ALL` (rollup), `FL-IA`, `FL-TP`, `FL-AE` |
| `locode` | dim_port | `SGSIN`, `NLRTM`, `KRPUS`, `CNSHA`, `LKCMB`, `AEDXB`, `USLAX`, `DEHAM`, `JPTYO`, `HKHKG` |
| `port_from`, `port_to` | noon_report, fact_performance_daily | the 10 `dim_port.locode` values above |
| `from_port`, `to_port` | fact_voyage | the 10 `dim_port.locode` values above |
| `is_eu` | dim_port | `true` (NLRTM, DEHAM only), `false` (the other 8) |

¹ Spec allows `anchor`/`maneuvering`; the generator emits only `at_sea`/`in_port`.
² `propeller_repair` is a valid `event_type` in the generator but does not appear
in the `--seed 42` dataset. `propeller_polishing`/`coating_renewal`/
`propeller_repair`/`engine_overhaul` do **not** reset the fouling clock — only
`hull_cleaning` ∪ `dry_dock` do; `engine_overhaul` is a light engine reset, not a
fouling reset. The per-process reset clocks are: hull fouling =
`hull_cleaning` ∪ `dry_dock`; propeller = `propeller_polishing` ∪ `dry_dock`;
coating = `coating_renewal` ∪ `dry_dock`; engine = `engine_overhaul` ∪ `dry_dock`.
³ Only `ok` appears in the `--seed 42` dataset; `insufficient_history` is the
degeneracy placeholder.

**Fuel constants** (`synthetic_data/physics.py`):

| Fuel | Carbon factor C_F (tCO₂/t) | Lower calorific value (MJ/kg) |
|---|---|---|
| HFO | 3.114 | 40.2 |
| VLSFO | 3.151 | 41.0 |
| MGO / LSMGO | 3.206 | 42.7 |

---

## 6. Athena query examples

Run in the Athena console (database `ym_datalake_poc`, workgroup
`ym-datalake-poc`) or via the deployed query Lambda. **Always add the partition
predicate** on partitioned tables so projection prunes the scan, and
**`CAST` date strings** for ordering / arithmetic.

```sql
-- 1. Row count for one vessel-year (partition prune: imo_number + year)
SELECT count(*)
FROM noon_report
WHERE imo_number = '9700006' AND year = 2023;

-- 2. YM WELLNESS daily speed loss, valid points only (prune imo/year/month, CAST date)
SELECT report_date, speed_loss_pct, cum_excess_cost_usd, cii_rating_aer
FROM fact_performance_daily
WHERE imo_number = '9700006' AND year = 2024 AND month = 8
  AND valid_flag = true
ORDER BY CAST(report_date AS date);

-- 3. Anomaly breakdown by cause × severity for one vessel
SELECT cause, severity, count(*) AS n
FROM fact_anomaly
WHERE imo_number = '9700006'
GROUP BY cause, severity
ORDER BY n DESC;

-- 4. Fleet dimension (full scan — small flat table)
SELECT imo_number, vessel_name, dwt, design_speed_kn, last_dry_dock_date
FROM dim_vessel
ORDER BY imo_number;

-- 5. Fleet trend: monthly average speed loss + total excess cost
SELECT year, month,
       round(avg(avg_speed_loss_pct), 2)   AS avg_speed_loss_pct,
       round(sum(total_excess_cost_usd), 0) AS excess_cost_usd,
       sum(n_alerts)                        AS alerts
FROM agg_fleet_daily
GROUP BY year, month
ORDER BY year, month;

-- 6. Period indicators for one vessel (ISP/DDP/ME/MT long format)
SELECT indicator, period_start, period_end, event_type, event_date, value, reference_value
FROM fact_performance_indicator
WHERE imo_number = '9700006'
ORDER BY indicator, event_date;

-- 7. Cleaning recommendation + net saving per vessel
SELECT imo_number, last_cleaning_date, recommended_clean_date, trigger_eta,
       t_star_days, net_saving_usd, status
FROM fact_recommendation
WHERE imo_number = '9700006';

-- 8. Voyage economics for one vessel (partition prune: imo_number), joined to ports
SELECT v.voyage_no, v.from_port, p.name AS from_name, v.to_port,
       v.depart_date, v.arrive_date, v.distance_nm, v.avg_speed_kn,
       v.total_foc_mt, v.fuel_cost_usd, v.usd_per_nm, v.on_time_flag
FROM fact_voyage v
JOIN dim_port p ON v.from_port = p.locode
WHERE v.imo_number = '9700006'
ORDER BY CAST(v.depart_date AS date);

-- 9. Latest position per vessel for the Fleet Map (row_number window, ~9 rows)
SELECT imo_number, vessel_name, report_date, latitude, longitude,
       speed_loss_pct, cii_rating_aer, voyage_phase, port_from, port_to, voyage_no
FROM (
  SELECT *, row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC) AS rn
  FROM fact_performance_daily
) WHERE rn = 1
ORDER BY imo_number;
```

### 6.1 Dashboard ↔ query ↔ table mapping (`poc-spec.md` §8.6)

All 18 `query_types` (`queries.py::QUERY_TYPES`) map to a Dashboard component:

| Dashboard component | `query_type` | Primary tables |
|---|---|---|
| Fleet KPI / table / map (scoped by `fleet_id` param, default `ALL`) | `fleet_overview` | `agg_fleet_daily`, `dim_vessel` |
| Fleet vessel roster / deep-dive header specs | `fleet_vessels` | `dim_vessel` |
| Fleet grouping dropdown | `fleet_list` | `dim_vessel` |
| Fleet alert feed / "Active alerts" KPI | `fleet_alerts` | `fact_alert` |
| Speed-loss trend + events | `vessel_speed_loss` | `fact_performance_daily`, `fact_maintenance_event`, `fact_uwi` |
| Deep-dive Slip/SFOC/Admiralty/fuel/CII panels; Fleet table's per-vessel CII/anomaly cols | `vessel_metrics` | `fact_performance_daily` |
| Speed–power scatter | `vessel_speed_power` | `fact_performance_daily`, `dim_reference_curve` |
| Anomaly timeline | `vessel_anomalies` | `fact_anomaly` |
| Vessel alert panel | `vessel_alerts` | `fact_alert` |
| Maintenance effect | `vessel_maintenance_effect` | `fact_maintenance_event` |
| Hull-cleaning optimization (t*/net saving) | `vessel_recommendation` | `fact_recommendation` |
| Maintenance recommendations (grouped planner windows / fleet next maintenance) | `vessel_maintenance_recommendation` | `fact_maintenance_recommendation` |
| Planner page — fleet maintenance backlog (Gantt / capex-by-quarter / ROI backlog); `est_cost_usd` derived query-time | `fleet_maintenance_recommendation` | `fact_maintenance_recommendation`, `fact_maintenance_event` |
| Latest inspection panel | `vessel_uwi` | `fact_uwi` |
| Fleet Map — one dot per vessel at its latest position | `fleet_positions` | `fact_performance_daily` |
| Deep-dive per-vessel track map (polyline of daily positions) | `vessel_track` | `fact_performance_daily` |
| Deep-dive sortable voyage-economics table | `vessel_voyages` | `fact_voyage` |
| Optimizer page — bunker/slow-steaming usd-per-nm curve (current / economical / schedule markers, live savings) | `vessel_speed_profile` | `fact_speed_profile` |
