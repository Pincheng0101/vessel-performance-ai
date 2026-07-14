---
name: reference_curve
description: raw M1 · vessel × speed point · unpartitioned. Clean-hull speed–power curve (12 points/vessel) — shared truth between generator and M2 ETL.
---

# reference_curve

## Description
Raw zone (M1). Grain: **one row per vessel per sea-trial speed point** (12
points/vessel, 0.5–1.05·Vdes at Δ_ref). Produced by the `ym_datalake.synthetic_data`
generator. This clean-hull speed–power curve is the **single source of truth**
shared by the generator (which injects speed loss against it) and the M2 ETL
(which recovers that loss against it) — sharing the curve is what makes injected
speed loss recoverable to the sensor-noise floor. `imo_number` is a 7-digit
string; `ref_curve_id` = `RC-<imo>`. Unpartitioned. The curated `dim_reference_curve`
is a pass-through mirror (identical 5 columns).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/reference_curve/reference_curve.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix; ~12 rows/vessel)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| ref_curve_id | string | No | curve id `RC-<imo>` |
| imo_number | string | No | FK → vessel (7-digit string) |
| speed_kn | double | No | speed point (kn) |
| shaft_power_kw | double | No | clean-hull shaft power at `speed_kn` and Δ_ref (kW) |
| displacement_ref_mt | double | No | reference displacement Δ_ref the curve is fitted at (t) |

5 columns, unpartitioned.

## Example queries
```sql
-- Clean-hull curve for one vessel, ascending speed
SELECT speed_kn, shaft_power_kw, displacement_ref_mt
FROM reference_curve
WHERE imo_number = '9700006'
ORDER BY speed_kn;

-- All curves, one row per vessel × speed point
SELECT imo_number, count(*) AS n_points, min(speed_kn) AS v_min, max(speed_kn) AS v_max
FROM reference_curve
GROUP BY imo_number
ORDER BY imo_number;
```

## Joins
- `reference_curve ⋈ vessel_master` ON `ref_curve_id` (or `imo_number`) for particulars.
- The curated analogue `dim_reference_curve` is what the Dashboard speed–power
  scatter unions with `fact_performance_daily` measured points; see
  `dim_reference_curve.md` for the `vessel_speed_power` `UNION ALL` pattern.
- Note: production canned queries are single-table (the raw curve is consumed by
  the ETL, not the query Lambda).
