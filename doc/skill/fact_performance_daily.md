---
name: fact_performance_daily
description: curated M2 · vessel × day · partitions imo_number, year, month. Main analytical table — ISO 15016/19030 corrected daily performance, CII, and M3-filled anomaly flags.
---

# fact_performance_daily

## Description
Curated zone (M2), the **main analytical table**. Grain: **one row per vessel per
day**. Produced by the `ym_datalake.etl` M2 pipeline, which inverts the forward
physics the generator used — ISO 15016 sea-trial correction + ISO 19030
hull/propeller performance + derived indicators + annual CII — recovering the
injected speed loss to the sensor-noise floor. `imo_number` is a 7-digit string;
the JSONL body repeats `imo_number`, `year`, `month` redundantly but Athena reads
them from the S3 path.

Key null semantics: any non-finite float (NaN/Inf) → `null`; the **ISO/derived**
columns (`resistance_*`, `power_corrected_kw`, `speed_corrected_kn`,
`v_expected_kn`, `speed_loss_pct`, `slip_*`, `sfoc_g_kwh`, `admiralty_coef`,
`excess_*`, `cum_excess_cost_usd`) are null on **in-port** days and on gross power
outliers (corrected power ≤ 0); `eeoi` is additionally null on **ballast /
zero-cargo** days. The M3 columns (`anomaly_flag`, `anomaly_cause`,
`anomaly_severity`) are emitted as stubs by M2 and **filled by M3**
(`anomaly_cause`/`anomaly_severity` stay null when the row was not flagged).

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_performance_daily/imo_number=<imo>/year=<yyyy>/month=<mm>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs) + **`year`**
  (integer `2021,2026`) + **`month`** (integer `1,12`, 2 digits). Always add
  `WHERE imo_number=… [AND year=… AND month=…]`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| year | int | No | *(partition)* calendar year |
| month | int | No | *(partition)* calendar month |
| report_date | string | No | `YYYY-MM-DD` |
| vessel_name | string | No | vessel name |
| voyage_phase | string | No | `at_sea` / `in_port` |
| condition_flag | string | No | `laden` / `ballast` |
| latitude | double | No | position latitude (°), copied from the Noon Report; on **every** row so tracks are continuous. Decorative — never feeds physics/CII |
| longitude | double | No | position longitude (°), copied from the Noon Report; on every row |
| port_from | string | No | departure UN/LOCODE (∈ `dim_port.locode`) |
| port_to | string | No | arrival UN/LOCODE (∈ `dim_port.locode`) |
| voyage_no | string | No | voyage number; FK → `fact_voyage.voyage_no` per `(imo_number, voyage_no)` |
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
| excess_cost_fouling_usd | double | in-port | fouling channel (= `excess_cost_usd`); see weather attribution |
| excess_cost_weather_usd | double | in-port | weather channel: fuel cost of wind+wave resistance power |
| excess_cost_operational_usd | double | in-port | operational channel: off-design engine-load SFOC penalty |
| cii_aer | double | No | annual AER attained (gCO₂/dwt·nm), broadcast onto each day |
| cii_rating_aer | string | No | `A`–`E` against the base AER reference line |
| cii_imo | double | No | annual IMO attained (= AER for container ships) |
| cii_rating_imo | string | No | `A`–`E` against the year's reduced `required` line |
| anomaly_flag | boolean | No | M3: true if this (imo, date) was flagged |
| anomaly_cause | string | when unflagged | M3: `engine_degradation`/`propeller`/`weather`/`sensor` |
| anomaly_severity | string | when unflagged | M3: `low`/`medium`/`high` |
| valid_flag | boolean | No | ISO 19030 gate — eligible for trend/indicator fits |

38 body columns + 3 partition keys.

The three `excess_cost_*_usd` channels are **additive** (weather & operational are extra
fuel on top of fouling), so they stack to a total that **exceeds** `excess_cost_usd`
(= the fouling channel). Check C20 verifies the identity + non-negativity + co-nullity.

**Positions are decorative.** `latitude`/`longitude`/`port_from`/`port_to`/
`voyage_no` are copied straight from the Noon Report and carried on every row (at
sea + in port) so the Fleet Map / per-vessel track are continuous; they roll up
`fact_voyage`. They **never** feed the physics — fuel, CII and ISO speed loss key
off distance & speed, never lat/lon. Powers the `fleet_positions` (latest row per
vessel) and `vessel_track` (daily polyline) query types.

**ISO 19030 `valid_flag`** is true when `voyage_phase = at_sea` **and** steaming
**and** `STW ≥ 0.5·V_design` **and** `Beaufort ≤ 6` **and**
`Δ ∈ [0.5, 1.2]·Δ_ref` **and** propulsion fields finite/positive. Filter on
`valid_flag = true` for any trend/indicator analysis.

## Example queries
```sql
-- Canned `vessel_speed_loss` (verbatim shape; ? bind shown as a literal)
SELECT report_date, speed_loss_pct, v_expected_kn, days_since_cleaning, valid_flag
FROM fact_performance_daily
WHERE imo_number = '9700006'
ORDER BY report_date;

-- Canned `vessel_metrics` — full Deep-dive metric set
SELECT report_date, speed_loss_pct, v_expected_kn, slip_real, slip_apparent,
       sfoc_g_kwh, admiralty_coef, eeoi, cii_aer, cii_rating_aer, cii_imo, cii_rating_imo,
       excess_cost_usd, cum_excess_cost_usd, excess_cost_fouling_usd, excess_cost_weather_usd,
       excess_cost_operational_usd, power_corrected_kw, resistance_wind_kn,
       resistance_wave_kn, co2_mt, days_since_cleaning, days_since_dry_dock,
       days_since_in_water, anomaly_flag, valid_flag
FROM fact_performance_daily
WHERE imo_number = '9700006'
ORDER BY report_date;

-- Valid daily speed loss for one vessel-month (prune imo/year/month, CAST date)
SELECT report_date, speed_loss_pct, cum_excess_cost_usd, cii_rating_aer
FROM fact_performance_daily
WHERE imo_number = '9700006' AND year = 2024 AND month = 8
  AND valid_flag = true
ORDER BY CAST(report_date AS date);

-- Canned `vessel_track` — daily positions for the Deep-dive track map
SELECT report_date, latitude, longitude, speed_loss_pct, cii_rating_aer,
       voyage_no, port_from, port_to
FROM fact_performance_daily
WHERE imo_number = '9700006'
ORDER BY report_date;

-- Canned `fleet_positions` — latest row per vessel for the Fleet Map (~9 rows)
SELECT imo_number, vessel_name, report_date, latitude, longitude, speed_loss_pct,
       cii_rating_aer, voyage_phase, port_from, port_to, voyage_no
FROM (
  SELECT *, row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC) AS rn
  FROM fact_performance_daily
) WHERE rn = 1
ORDER BY imo_number;
```
> The canned queries filter only `imo_number` (a partition key); add
> `AND year=… AND month=…` to prune further when you know the window.

## Joins
`imo_number` (7-digit string) is the universal join key; `report_date` /
`event_date` add the day dimension.
- `fact_performance_daily ⋈ dim_reference_curve` ON `imo_number` — the Dashboard
  speed–power scatter unions them (see the `UNION ALL` pattern below).
- `fact_performance_daily ⋈ fact_maintenance_event` / `fact_uwi` ON `imo_number`
  (+ a date window around `event_date` / `inspection_date`).
- `fact_performance_daily ⋈ fact_anomaly` ON `(imo_number, report_date)`.
- `fact_performance_daily ⋈ fact_recommendation` / `fact_performance_indicator`
  ON `imo_number`.
- `fact_performance_daily ⋈ fact_voyage` ON `(imo_number, voyage_no)` — the daily
  rows a voyage rolls up from; `fact_voyage ⋈ dim_port` ON `from_port`/`to_port`
  resolves port names/coords/`is_eu`.
- `agg_fleet_daily ⋈ fact_performance_daily` ON `report_date` (agg = these daily
  rows grouped over the fleet).
- Note: production canned queries are single-table (except `vessel_speed_power`,
  the `UNION ALL` below); cross-table stitching happens client-side / in ETL.

```sql
-- Canned `vessel_speed_power`: measured points ∪ clean-hull reference curve
SELECT 'measured' AS series, speed_corrected_kn AS speed_kn,
       power_corrected_kw AS power_kw, days_since_cleaning
FROM fact_performance_daily
WHERE imo_number = '9700006' AND valid_flag
UNION ALL
SELECT 'reference' AS series, speed_kn, shaft_power_kw AS power_kw,
       CAST(NULL AS integer) AS days_since_cleaning
FROM dim_reference_curve
WHERE imo_number = '9700006';

-- Daily record ⋈ same-day anomaly detail
SELECT d.report_date, d.speed_loss_pct, a.metric, a.severity, a.cause
FROM fact_performance_daily d
JOIN fact_anomaly a
  ON d.imo_number = a.imo_number AND d.report_date = a.report_date
WHERE d.imo_number = '9700006'
ORDER BY CAST(d.report_date AS date);
```
