---
name: noon_report
description: raw M1 · vessel × day · partitions imo_number, year. Daily sensor noon report — the raw measured operating record each M2 performance calc is derived from.
---

# noon_report

## Description
Raw zone (M1). Grain: **one row per vessel per day** (the noon report). Produced by
the `ym_datalake.synthetic_data` generator. This is the raw measured operating
record (position, speed, power, fuel, draft, weather) that the M2 ETL corrects
(ISO 15016/19030) into `fact_performance_daily`. `imo_number` is a **7-digit
string** and is the universal join key; the JSONL body repeats `imo_number`
redundantly but Athena reads it from the S3 path, so the body copy is ignored.
All temporal fields are strings; any non-finite float (NaN/Inf) is written as
`null`. `data_source` is always `sensor`.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs `9700001`–`9700009`) +
  **`year`** (integer `2021,2026`). Always add `WHERE imo_number=… [AND year=…]`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
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
| heading_deg | double | No | vessel heading (°); lets ETL reconstruct wind/wave correction |
| steaming_hours | double | No | hours steamed (≈24 at sea, 0 in port) |
| distance_og_nm | double | No | distance over ground (nm) = speed·hours |
| distance_tw_nm | double | No | distance through water (nm) |
| speed_og_kn | double | No | speed over ground / SOG (kn) |
| speed_tw_kn | double | No | speed through water / STW (kn) |
| me_rpm | double | No | main-engine RPM |
| me_shaft_power_kw | double | No | measured shaft power (kW) |
| me_foc_mt | double | No | ME fuel-oil consumption (t) |
| propeller_pitch_m | double | No | fixed-pitch propeller pitch (m) |
| fuel_type | string | No | at-sea fuel: `HFO` (scrubber vessels) / `VLSFO`; `MGO` in port |
| fuel_lcv_mj_kg | double | No | lower calorific value (MJ/kg) |
| ae_foc_mt | double | No | auxiliary-engine FOC (t) |
| boiler_foc_mt | double | No | boiler FOC (t) |
| total_foc_mt | double | No | total FOC = ME+AE+boiler (t) |
| draft_fore_m | double | No | forward draft (m) |
| draft_aft_m | double | No | aft draft (m) |
| mean_draft_m | double | No | mean draft = (fore+aft)/2 (m) |
| trim_m | double | No | trim = aft − fore (m) |
| displacement_mt | double | No | displacement Δ from mass balance → hydrostatic (t) |
| cargo_weight_mt | double | No | cargo weight (t) |
| condition_flag | string | No | `laden` / `ballast` |
| wind_speed_kn | double | No | true wind speed (kn) |
| wind_dir_deg | double | No | wind direction (°) |
| beaufort | int | No | Beaufort number |
| wave_height_m | double | No | significant wave height Hs (m) |
| wave_dir_deg | double | No | wave direction (°) |
| wave_period_s | double | No | wave period (s) |
| swell_height_m | double | No | swell height (m) |
| swell_dir_deg | double | No | swell direction (°) |
| sea_water_temp_c | double | No | sea-water temperature (°C) |
| air_temp_c | double | No | air temperature (°C) |
| air_pressure_hpa | double | No | air pressure (hPa) |
| current_speed_kn | double | No | current speed (kn) |
| current_dir_deg | double | No | current direction (°) |
| sea_water_density_kg_m3 | double | No | sea-water density (kg/m³) |
| data_source | string | No | `sensor` |

47 body columns + 2 partition keys.

## Example queries
```sql
-- Row count for one vessel-year (partition prune: imo_number + year)
SELECT count(*)
FROM noon_report
WHERE imo_number = '9700006' AND year = 2023;

-- At-sea speed/power/fuel track for one vessel-year, chronological
SELECT report_datetime_utc, speed_tw_kn, me_shaft_power_kw, total_foc_mt, condition_flag
FROM noon_report
WHERE imo_number = '9700006' AND year = 2023
  AND voyage_phase = 'at_sea'
ORDER BY CAST(report_datetime_utc AS timestamp);
```

## Joins
`imo_number` (7-digit string) is the universal join key.
- `noon_report ⋈ vessel_master` / `reference_curve` / `uwi` / `maintenance_event`
  ON `imo_number`.
- `noon_report ⋈ fuel_price` ON date + fuel_type — noon_report has no `report_date`
  column, so derive the date from `report_datetime_utc`:
  `ON substr(nr.report_datetime_utc, 1, 10) = fp.date AND nr.fuel_type = fp.fuel_type`.
- Production canned queries are single-table (joins live in the M2 ETL); the query
  Lambda never emits a raw `noon_report` query.

```sql
-- Price each day's ME fuel burn (noon_report ⋈ fuel_price on date + fuel_type)
SELECT nr.report_datetime_utc, nr.fuel_type, nr.me_foc_mt,
       fp.price_usd_per_mt, nr.me_foc_mt * fp.price_usd_per_mt AS me_fuel_cost_usd
FROM noon_report nr
JOIN fuel_price fp
  ON substr(nr.report_datetime_utc, 1, 10) = fp.date
 AND nr.fuel_type = fp.fuel_type
WHERE nr.imo_number = '9700006' AND nr.year = 2023
ORDER BY CAST(nr.report_datetime_utc AS timestamp);
```
