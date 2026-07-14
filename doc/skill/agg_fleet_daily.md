---
name: agg_fleet_daily
description: curated M2 (+M3 col) · (fleet, day) · unpartitioned (flat). Daily aggregate per fleet_id — an 'ALL' rollup + FL-* sub-fleets; no imo_number. ALWAYS filter fleet_id. Backs the Dashboard fleet overview.
---

# agg_fleet_daily

## Description
Curated zone (M2, with one M3-filled column). Grain: **one row per (fleet, day)**
(there is **no `imo_number`**; each row summarises the vessels of one `fleet_id`
for that date). Produced by the `ym_datalake.etl` M2 pipeline. Each date has a
synthetic **`fleet_id='ALL'` rollup** (whole fleet — identical to the historical
single-grain aggregate) **plus one row per sub-fleet** (`FL-IA`/`FL-TP`/`FL-AE`).
**Flat / unpartitioned**: `fleet_id`/`year`/`month` are ordinary **body columns**,
not partition keys. `n_alerts` is emitted **null** by M2 and **filled by M3**
(# flagged rows across the fleet that day). Backs the Dashboard `fleet_overview`
KPI / table / map (the fleet dropdown passes `fleet_id`; default `ALL`).

> **ALWAYS filter `fleet_id`** (e.g. `WHERE fleet_id='ALL'`) — otherwise a scan
> double-counts the `ALL` rollup against its sub-fleet rows.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/agg_fleet_daily/agg_fleet_daily.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix). `fleet_id`/`year`/`month` are body
  columns — filter them if you like, but they do **not** prune S3 like a partition
  key would.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| fleet_id | string | No | `ALL` (all-fleet rollup) or a sub-fleet (`FL-IA`/`FL-TP`/`FL-AE`) |
| report_date | string | No | `YYYY-MM-DD` |
| year | int | No | calendar year (body column, **not** a partition) |
| month | int | No | calendar month (body column, **not** a partition) |
| n_vessels | int | No | vessels reporting that day (in the fleet) |
| avg_speed_loss_pct | double | Yes | mean of valid daily `speed_loss_pct` across the fleet |
| total_excess_cost_usd | double | Yes | Σ `excess_cost_usd` across the fleet |
| cii_count_a | int | No | # vessels rated CII A that day |
| cii_count_b | int | No | # vessels rated CII B |
| cii_count_c | int | No | # vessels rated CII C |
| cii_count_d | int | No | # vessels rated CII D |
| cii_count_e | int | No | # vessels rated CII E |
| n_alerts | int | No | M3: # flagged rows across the fleet that day |

13 body columns, unpartitioned.

## Example queries
```sql
-- Canned `fleet_overview` (verbatim shape; fleet_id defaults to 'ALL', optional date range)
SELECT report_date, n_vessels, avg_speed_loss_pct, total_excess_cost_usd,
       cii_count_a, cii_count_b, cii_count_c, cii_count_d, cii_count_e, n_alerts
FROM agg_fleet_daily
WHERE fleet_id = 'ALL' AND report_date BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY report_date;

-- One sub-fleet's latest day
SELECT report_date, n_vessels, avg_speed_loss_pct
FROM agg_fleet_daily
WHERE fleet_id = 'FL-AE'
ORDER BY report_date DESC
LIMIT 1;

-- Fleet trend: monthly average speed loss + total excess cost + alerts (rollup only)
SELECT year, month,
       round(avg(avg_speed_loss_pct), 2)    AS avg_speed_loss_pct,
       round(sum(total_excess_cost_usd), 0) AS excess_cost_usd,
       sum(n_alerts)                        AS alerts
FROM agg_fleet_daily
WHERE fleet_id = 'ALL'
GROUP BY year, month
ORDER BY year, month;
```

## Joins
- `agg_fleet_daily ⋈ fact_performance_daily` ON `report_date` — the aggregate is
  exactly the daily fact rows grouped over the fleet; join per day to drill from a
  fleet total into the contributing vessels.
- Note: production canned queries are single-table; the Dashboard pairs
  `fleet_overview` (this table) with `fleet_vessels`/`dim_vessel` client-side.

```sql
-- Fleet-day total ⋈ the per-vessel rows behind it (rollup row only, else fan-out)
SELECT a.report_date, a.avg_speed_loss_pct,
       d.imo_number, d.speed_loss_pct
FROM agg_fleet_daily a
JOIN fact_performance_daily d ON a.report_date = d.report_date
WHERE a.fleet_id = 'ALL' AND d.imo_number = '9700006' AND a.report_date = '2024-08-15';
```
