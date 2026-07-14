---
name: maintenance_event
description: raw M1 · event · unpartitioned. Maintenance/dry-dock events — only hull_cleaning ∪ dry_dock reset the fouling clock.
---

# maintenance_event

## Description
Raw zone (M1). Grain: **one row per maintenance/event**. Produced by the
`ym_datalake.synthetic_data` generator. Only **`hull_cleaning` ∪ `dry_dock`**
reset the fouling clock (`fact_performance_daily.days_since_cleaning`); the other
event types (`propeller_polishing`, `coating_renewal`, `propeller_repair`,
`engine_overhaul`) do **not**. They are instead the **reset clocks** for the
independent degradation processes M3 forecasts: propeller_polishing ∪ dry_dock
(propeller roughness), coating_renewal ∪ dry_dock (coating breakdown), and
engine_overhaul ∪ dry_dock (engine SFOC drift). `imo_number` is a 7-digit string;
`event_id` = `MV-<imo>-<date>-<type>`.
Unpartitioned. The curated `fact_maintenance_event` mirrors this table (minus the
`imo_number` body key, which becomes its partition) and adds two M3-filled effect
columns (`me_recovery_pct`, `payback_days`).

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/maintenance_event/maintenance_event.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| event_id | string | No | `MV-<imo>-<date>-<type>` |
| imo_number | string | No | FK → vessel (7-digit string) |
| event_date | string | No | `YYYY-MM-DD` |
| event_type | string | No | `hull_cleaning` / `propeller_polishing` / `dry_dock` / `coating_renewal` / `propeller_repair` / `engine_overhaul` |
| cost_usd | double | No | cash cost (USD) |
| downtime_hours | double | No | out-of-service hours (event full cost adds `downtime·$1000/h`) |
| location | string | No | port / yard |

7 columns, unpartitioned.

## Example queries
```sql
-- All events for one vessel, chronological
SELECT event_date, event_type, cost_usd, downtime_hours, location
FROM maintenance_event
WHERE imo_number = '9700006'
ORDER BY CAST(event_date AS date);

-- Fouling-clock resets only (hull_cleaning ∪ dry_dock)
SELECT imo_number, event_date, event_type, cost_usd
FROM maintenance_event
WHERE event_type IN ('hull_cleaning', 'dry_dock')
ORDER BY imo_number, CAST(event_date AS date);
```

## Joins
- `maintenance_event ⋈ vessel_master` ON `imo_number` for particulars.
- `maintenance_event ⋈ noon_report` ON `imo_number` + a date window around
  `event_date` (before/after windows quantify the recovery an event produced).
- Note: production canned queries are single-table; the Dashboard reads the
  curated `fact_maintenance_event` (which adds `me_recovery_pct` / `payback_days`).

```sql
-- Operating days in the ±30-day window around each event (event ⋈ daily record)
SELECT me.event_date, me.event_type, nr.report_datetime_utc, nr.speed_tw_kn
FROM maintenance_event me
JOIN noon_report nr
  ON me.imo_number = nr.imo_number
 AND CAST(substr(nr.report_datetime_utc, 1, 10) AS date)
       BETWEEN date_add('day', -30, CAST(me.event_date AS date))
           AND date_add('day',  30, CAST(me.event_date AS date))
WHERE me.imo_number = '9700006' AND me.event_type = 'hull_cleaning'
ORDER BY CAST(me.event_date AS date), CAST(nr.report_datetime_utc AS timestamp);
```
