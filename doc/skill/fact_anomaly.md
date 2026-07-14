---
name: fact_anomaly
description: curated M3 · flagged (vessel, day) · partitions imo_number. Point anomalies at the driver metric with rule-based cause + severity. Biofouling is never a cause.
---

# fact_anomaly

## Description
Curated zone (M3 — statistical insight). Grain: **one row per flagged
`(imo, date)`**, emitted at the **driver metric** — the channel with the largest
global (MAD) residual z-score on that day. Produced by the `ym_datalake.etl` M3
stage (`anomaly.py`). `imo_number` is a 7-digit string. **Biofouling is a trend
slope, never a point-anomaly cause**: the `cause` set is
`{engine_degradation, propeller, weather, sensor}`; gradual hull fouling shows up
as the segment slope in `fact_recommendation.fouling_rate_pct_per_day`, not a
flag. Backs the Dashboard `vessel_anomalies` timeline. (The paired flag lives on
`fact_performance_daily.anomaly_flag/cause/severity`, which M3 fills for the same
`(imo, date)`.)

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_anomaly/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| report_date | string | No | flagged day `YYYY-MM-DD` |
| metric | string | No | driver channel: `speed_loss` / `slip` / `sfoc` / `excess_foc` |
| value | double | No | that channel's observed value on the flagged day |
| z_score | double | No | global (MAD) residual z-score of the driver channel |
| severity | string | No | `low` / `medium` / `high` |
| cause | string | No | `engine_degradation` / `propeller` / `weather` / `sensor` |

6 body columns + 1 partition key.

## Example queries
```sql
-- Canned `vessel_anomalies` (verbatim shape; ? bind shown as a literal)
SELECT report_date, metric, value, z_score, severity, cause
FROM fact_anomaly
WHERE imo_number = '9700006'
ORDER BY report_date;

-- Anomaly breakdown by cause × severity for one vessel
SELECT cause, severity, count(*) AS n
FROM fact_anomaly
WHERE imo_number = '9700006'
GROUP BY cause, severity
ORDER BY n DESC;
```

## Joins
- `fact_anomaly ⋈ fact_performance_daily` ON `(imo_number, report_date)` — pull
  the full corrected metric context for a flagged day.
- Note: production canned queries are single-table; `fact_performance_daily`
  already carries the mirror `anomaly_flag`/`anomaly_cause`/`anomaly_severity`, so
  the join is only needed for the driver `metric` / `z_score` detail.

```sql
-- Flagged day ⋈ that day's corrected performance context
SELECT a.report_date, a.metric, a.z_score, a.severity, a.cause,
       d.speed_loss_pct, d.sfoc_g_kwh, d.slip_real, d.excess_foc_mt
FROM fact_anomaly a
JOIN fact_performance_daily d
  ON a.imo_number = d.imo_number AND a.report_date = d.report_date
WHERE a.imo_number = '9700006'
ORDER BY CAST(a.report_date AS date);
```
