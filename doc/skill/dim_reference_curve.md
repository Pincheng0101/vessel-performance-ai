---
name: dim_reference_curve
description: curated M2 · vessel × speed point · unpartitioned. Pass-through of raw reference_curve — clean-hull curve unioned with measured points in the speed–power scatter.
---

# dim_reference_curve

## Description
Curated zone (M2). Grain: **one row per vessel per speed point** (12
points/vessel). Produced by the `ym_datalake.etl` M2 pipeline as a
**pass-through of raw `reference_curve`** (identical 5 columns). `imo_number` is
a 7-digit string; `ref_curve_id` = `RC-<imo>`. Unpartitioned. Used with
`fact_performance_daily` to draw the Dashboard **speed–power scatter**
(`vessel_speed_power`): measured corrected points overlaid on this clean-hull
reference curve via a `UNION ALL`.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/dim_reference_curve/dim_reference_curve.jsonl`
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
FROM dim_reference_curve
WHERE imo_number = '9700006'
ORDER BY speed_kn;
```

## Joins
- `dim_reference_curve ⋈ fact_performance_daily` ON `imo_number` — the canned
  `vessel_speed_power` query (the `UNION ALL` below) is the primary use.
- `dim_reference_curve ⋈ dim_vessel` ON `ref_curve_id` (or `imo_number`).
- Note: production canned queries are single-statement; `vessel_speed_power` is
  the one that spans two tables (via `UNION ALL`, not a join).

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
```
