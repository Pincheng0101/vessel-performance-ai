---
name: fact_maintenance_event
description: curated M2 (+M3 cols) · event · partitions imo_number. Pass-through of raw maintenance_event plus M3-filled me_recovery_pct / payback_days.
---

# fact_maintenance_event

## Description
Curated zone (M2, with two M3-filled columns). Grain: **one row per maintenance
event**. Produced by the `ym_datalake.etl` M2 pipeline as a **pass-through of raw
`maintenance_event`** (minus the `imo_number` body key, which becomes the
partition), plus two effect columns — `me_recovery_pct` and `payback_days` — that
M2 emits **null** and M3 (`recommendation.py`) **fills**. `imo_number` is a
7-digit string. Only `hull_cleaning` ∪ `dry_dock` reset the fouling clock; the
other types are the reset clocks for the independent M3 forecasts (propeller /
coating / `engine_overhaul`). Backs the Dashboard `vessel_maintenance_effect` panel.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_maintenance_event/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| event_id | string | No | `MV-<imo>-<date>-<type>` |
| event_date | string | No | `YYYY-MM-DD` |
| event_type | string | No | `hull_cleaning` / `propeller_polishing` / `dry_dock` / `coating_renewal` / `propeller_repair` / `engine_overhaul` |
| cost_usd | double | No | cash cost (USD) |
| downtime_hours | double | No | out-of-service hours |
| location | string | No | port / yard |
| me_recovery_pct | double | Yes | M3: `ME.value / ME.reference_value × 100` = (before−after)/before × 100; can be negative; null if no ME row |
| payback_days | double | Yes | M3: event full cost ÷ daily excess-cost saving (±30 d); null if window empty or saving ≤ 0 |

8 body columns + 1 partition key.

## Example queries
```sql
-- Canned `vessel_maintenance_effect` (verbatim shape; ? bind shown as a literal)
SELECT event_date, event_type, cost_usd, downtime_hours, me_recovery_pct, payback_days
FROM fact_maintenance_event
WHERE imo_number = '9700006'
ORDER BY event_date;

-- Cleaning/dry-dock events with quantified recovery, best first
SELECT event_date, event_type, cost_usd, me_recovery_pct, payback_days
FROM fact_maintenance_event
WHERE imo_number = '9700006' AND event_type IN ('hull_cleaning', 'dry_dock')
ORDER BY me_recovery_pct DESC;
```

## Joins
- `fact_maintenance_event ⋈ fact_performance_indicator` ON
  `(imo_number, event_date)` — the ME/DDP indicator rows key to the same event.
- `fact_maintenance_event ⋈ fact_performance_daily` ON `imo_number` + a date
  window around `event_date` (before/after recovery).
- Note: production canned queries are single-table.

```sql
-- Event ⋈ its maintenance-effect indicator
SELECT m.event_date, m.event_type, m.cost_usd, m.me_recovery_pct,
       i.value AS recovered_pct_pts, i.reference_value AS before_mean
FROM fact_maintenance_event m
JOIN fact_performance_indicator i
  ON m.imo_number = i.imo_number AND m.event_date = i.event_date
 AND i.indicator = 'ME'
WHERE m.imo_number = '9700006'
ORDER BY CAST(m.event_date AS date);
```
