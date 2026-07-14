---
name: fact_alert
description: curated M3 · open alert episode (vessel × episode) · partitions imo_number. Early-warning feed promoting fact_anomaly + fact_recommendation into deduped, narrated episodes. Biofouling IS a cause here.
---

# fact_alert

## Description
Curated zone (M3 — statistical insight). Grain: **one row per open alert
episode** `(imo, cause, opened_date)`. Produced by the `ym_datalake.etl` M3 stage
(`alerts.py`) as a **promotion / narration layer** over the point facts — it runs
no new detection. `imo_number` is a 7-digit string. Two sources feed it:

- **Point anomalies** — consecutive same-`cause` `fact_anomaly` days are collapsed
  into one episode (gap tolerance **7 days**): `opened_date` / `last_seen_date`,
  peak severity + peak |z|, the driver `metric` at the peak, and the window's
  excess fuel cost. `source='anomaly'`.
- **Hull biofouling** — the one cause that is a **trend, never a point anomaly**.
  Sourced from the fouling cost model (`fact_recommendation`: positive fouling
  rate + a trigger ETA) plus the trailing-14-day speed loss vs the 8 % maintenance
  trigger; severity tracks trigger proximity (high within 60 days / already over,
  else medium). `source='fouling_model'`. This is where biofouling finally becomes
  a **classified, surfaced cause** (it is deliberately absent from `fact_anomaly`).

Each row carries a bilingual `message_zh`/`message_en` narrative + a
`recommended_action`, `status='open'`, and its `fleet_id`. Backs the Dashboard
`fleet_alerts` feed, the Fleet Overview "Active alerts" KPI, and the deep-dive
`vessel_alerts` panel.

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_alert/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). The fleet-wide
  `fleet_alerts` query intentionally scans all partitions (small feed); the
  per-vessel `vessel_alerts` query prunes with `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| alert_id | string | No | `AL-<imo>-<opened_date>-<cause>` (stable, unique per episode) |
| fleet_id | string | No | operational fleet (`FL-IA` / `FL-TP` / `FL-AE`) |
| opened_date | string | No | episode start `YYYY-MM-DD` (biofouling: the cleaning-cycle start) |
| last_seen_date | string | No | most recent flagged day (biofouling: latest report date) |
| cause | string | No | `hull_biofouling` / `propeller` / `engine_degradation` / `weather` / `sensor` |
| severity | string | No | `low` / `medium` / `high` (episode peak) |
| driver_metric | string | No | `speed_loss` / `slip` / `sfoc` / `excess_foc` (peak-z channel; biofouling = `speed_loss`) |
| peak_value | double | Yes | driver channel value at the peak (biofouling: trailing-14d speed loss %) |
| peak_z | double | Yes | peak residual z-score of the episode (**null for biofouling** — a trend, not a z) |
| excess_cost_usd | double | Yes | window excess fuel cost (biofouling: cumulative fouling penalty this cycle) |
| recommended_action | string | No | bilingual `中文 (English)` recommended action |
| status | string | No | `open` (only value emitted; ack is Dashboard-local) |
| source | string | No | `anomaly` (point episode) / `fouling_model` (biofouling trend) |
| message_zh | string | No | 中文 narrative |
| message_en | string | No | English narrative |

15 body columns + 1 partition key.

## Example queries
```sql
-- Canned `vessel_alerts` (verbatim shape; ? bind shown as a literal)
SELECT alert_id, fleet_id, opened_date, last_seen_date, cause, severity, driver_metric,
       peak_value, peak_z, excess_cost_usd, recommended_action, status, source, message_zh, message_en
FROM fact_alert
WHERE imo_number = '9700006'
ORDER BY last_seen_date DESC;

-- Canned `fleet_alerts` (fleet-wide open feed; optional fleet_id / severity filter)
SELECT imo_number, alert_id, fleet_id, opened_date, last_seen_date, cause, severity,
       driver_metric, peak_value, peak_z, excess_cost_usd, recommended_action, status, source, message_zh, message_en
FROM fact_alert
WHERE status = 'open' AND fleet_id = 'FL-AE' AND severity = 'high'
ORDER BY last_seen_date DESC;

-- Open alert count by cause across the fleet
SELECT cause, count(*) AS n
FROM fact_alert
WHERE status = 'open'
GROUP BY cause
ORDER BY n DESC;
```

## Joins
- `fact_alert ⋈ fact_anomaly` ON `(imo_number, report_date)` — expand a point
  episode back into its constituent flagged days (`opened_date`/`last_seen_date`
  bound the range; a biofouling episode has no `fact_anomaly` rows).
- `fact_alert ⋈ fact_recommendation` ON `imo_number` — pull the fouling cost model
  (`t_star_days`, `net_saving_usd`) behind a `hull_biofouling` alert.
- `fact_alert ⋈ dim_vessel` ON `imo_number` (or `fleet_id`) — vessel name / fleet
  roster for the feed.

```sql
-- Biofouling alerts ⋈ the cost model that raised them
SELECT a.imo_number, a.severity, a.last_seen_date,
       r.trigger_eta, r.t_star_days, r.net_saving_usd
FROM fact_alert a
JOIN fact_recommendation r ON a.imo_number = r.imo_number
WHERE a.cause = 'hull_biofouling' AND a.status = 'open';
```
