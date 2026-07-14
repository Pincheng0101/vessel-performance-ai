---
name: fact_performance_indicator
description: curated M2 · vessel × ISO 19030 indicator · partitions imo_number. Long-format period indicators (ISP/DDP/ME/MT); column meaning depends on the indicator code.
---

# fact_performance_indicator

## Description
Curated zone (M2). Grain: **one row per vessel per ISO 19030 period indicator**
(long format). Produced by the `ym_datalake.etl` M2 pipeline (`periods.py`) over
*valid* daily speed loss. `imo_number` is a 7-digit string. The meaning of
`value` / `reference_value` / `period_*` / `event_*` / `detail` **depends on the
`indicator` code** (`ISP` / `DDP` / `ME` / `MT`) — see the per-indicator sub-table.
The **MT** (maintenance trigger) threshold is **`8.0`** (`periods.MT_TRIGGER_PCT
= 8.0`); the code value is authoritative even where prose describes it as ~10%.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_performance_indicator/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| indicator | string | No | `ISP` / `DDP` / `ME` / `MT` (see below) |
| period_start | string | ISP only | period start `YYYY-MM-DD` |
| period_end | string | ISP, DDP | period end `YYYY-MM-DD` |
| event_type | string | ME, DDP | maintenance event type the row is keyed to |
| event_date | string | ME, DDP, MT | event / crossing date |
| value | double | Yes | the indicator's value (per code below) |
| reference_value | double | ISP, ME, DDP | the indicator's baseline (per code below) |
| detail | string | ME, MT | free-text detail |

8 body columns + 1 partition key.

**Per-`indicator` semantics** (which columns are populated and what `value` /
`reference_value` mean):

| Code | Meaning | `value` | `reference_value` | Other populated |
|---|---|---|---|---|
| **ISP** | In-service performance: per-cycle mean speed loss vs the first cycle | cycle mean `speed_loss_pct` | first cycle's mean | `period_start`/`period_end` = cycle bounds |
| **DDP** | Dry-dock performance: mean speed loss in the ±45-day window around a dry dock | mean speed loss 45 d **after** | mean speed loss 45 d **before** | `event_type=dry_dock`, `event_date`, `period_end`=date+45 d |
| **ME** | Maintenance effect: recovery at one event (before − after, ±30 d) | before − after (+ = recovered) | before-window mean | `event_type`, `event_date`, `detail="after=<x>"` |
| **MT** | Maintenance trigger: first date the 14-day trailing-mean speed loss crosses the trigger | `8.0` (the threshold) | null | `event_date`=crossing date, `detail="trailing-mean speed loss crossed trigger"` |

## Example queries
```sql
-- Period indicators for one vessel (ISP/DDP/ME/MT long format)
SELECT indicator, period_start, period_end, event_type, event_date, value, reference_value
FROM fact_performance_indicator
WHERE imo_number = '9700006'
ORDER BY indicator, event_date;

-- Just the maintenance-effect rows, largest recovery first
SELECT event_type, event_date, value AS recovered_pct_pts, reference_value AS before_mean, detail
FROM fact_performance_indicator
WHERE imo_number = '9700006' AND indicator = 'ME'
ORDER BY value DESC;
```

## Joins
- `fact_performance_indicator ⋈ fact_maintenance_event` ON
  `(imo_number, event_date)` — attach an ME/DDP indicator to the event that
  produced it.
- `fact_performance_indicator ⋈ fact_performance_daily` ON `imo_number` (+ the
  indicator's `period_*` / `event_date` window against `report_date`).
- Note: production canned queries are single-table; the ETL builds these
  indicators from daily rows.

```sql
-- Maintenance-effect indicator ⋈ the event it measures
SELECT i.event_date, i.event_type, i.value AS recovered_pct_pts,
       m.cost_usd, m.me_recovery_pct, m.payback_days
FROM fact_performance_indicator i
JOIN fact_maintenance_event m
  ON i.imo_number = m.imo_number AND i.event_date = m.event_date
WHERE i.imo_number = '9700006' AND i.indicator = 'ME'
ORDER BY CAST(i.event_date AS date);
```
