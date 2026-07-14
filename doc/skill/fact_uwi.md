---
name: fact_uwi
description: curated M2 · inspection · partitions imo_number. Pass-through of raw uwi (imo_number body key → partition) — underwater inspection findings.
---

# fact_uwi

## Description
Curated zone (M2). Grain: **one row per underwater inspection**. Produced by the
`ym_datalake.etl` M2 pipeline as a **pass-through of raw `uwi`**, minus the
`imo_number` body key (which becomes the partition). Identical column meanings to
raw `uwi` (§2.4). `imo_number` is a 7-digit string. Backs the Dashboard
`vessel_speed_loss` event overlay (inspection markers on the speed-loss trend).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_uwi/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| inspection_id | string | No | `UWI-<imo>-<date>` |
| inspection_date | string | No | `YYYY-MM-DD` |
| inspection_type | string | No | `diver` / `ROV` / `UWI` |
| hull_fouling_rating | int | No | hull-fouling rating (higher = more fouled) |
| hull_fouling_coverage_pct | double | No | % of hull area fouled |
| propeller_condition | string | No | Rubert scale `A`–`F` (A best), banded from `propeller_roughness_um` |
| propeller_roughness_um | double | No | propeller roughness (µm), independent resettable process (polish clock) |
| coating_breakdown_pct | double | No | coating breakdown 0–100 %, independent resettable process (coating clock) |
| coating_condition | string | No | `good` (<20%) / `fair` (20–45%) / `poor` (≥45%), banded from `coating_breakdown_pct` |
| recommended_action | string | No | `none` / `polish` / `clean` |

10 body columns + 1 partition key (raw `uwi`'s 11 columns minus the `imo_number`
body key, now the partition).

## Example queries
```sql
-- All inspections for one vessel, chronological
SELECT inspection_date, inspection_type, hull_fouling_rating,
       hull_fouling_coverage_pct, propeller_condition, recommended_action
FROM fact_uwi
WHERE imo_number = '9700006'
ORDER BY CAST(inspection_date AS date);
```

## Joins
- `fact_uwi ⋈ fact_performance_daily` ON `imo_number` (+ align `inspection_date`
  to `report_date`) — corroborate observed fouling against corrected speed loss.
- `fact_uwi ⋈ dim_vessel` ON `imo_number` for particulars.
- Note: production canned queries are single-table; the Dashboard overlays
  inspections on the speed-loss trend client-side.

```sql
-- Inspection ⋈ that day's corrected speed loss
SELECT u.inspection_date, u.hull_fouling_rating, u.recommended_action,
       d.speed_loss_pct, d.days_since_cleaning
FROM fact_uwi u
JOIN fact_performance_daily d
  ON u.imo_number = d.imo_number AND u.inspection_date = d.report_date
WHERE u.imo_number = '9700006'
ORDER BY CAST(u.inspection_date AS date);
```
