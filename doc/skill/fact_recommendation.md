---
name: fact_recommendation
description: curated M3 · vessel · unpartitioned (flat). Optimal-cleaning recommendation per vessel — imo_number is a body column, trigger at 8% speed loss.
---

# fact_recommendation

## Description
Curated zone (M3 — statistical insight). Grain: **one row per vessel**. Produced
by the `ym_datalake.etl` M3 stage (`recommendation.py`). **Flat / unpartitioned**:
`imo_number` is an ordinary **body column here, not a partition**. Fits the open
fouling cycle's daily excess-cost rate and minimises the cycle cost rate in closed
form: `c(t)=α+β·t`, `J(T)=K/T+α+β·T/2`, `T*=√(2K/β)`, where `K` = median
hull-cleaning full cost (falling back to the fleet median). `trigger_eta` is the
date the open cycle reaches **8%** speed loss (the authoritative
`MT_TRIGGER_PCT = 8.0`), null if the slope ≤ 0. `imo_number` is a 7-digit string.
Backs the Dashboard `vessel_recommendation` panel.

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_recommendation/fact_recommendation.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix; 1 row/vessel). `imo_number` is a body
  column — filter it, but it does **not** prune S3 like a partition key.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (7-digit string, **body column**) |
| last_cleaning_date | string | No | reconstructed last `hull_cleaning`/`dry_dock` reset |
| recommended_clean_date | string | Yes | `last_cleaning + round(T*)` |
| trigger_eta | string | Yes | date the open cycle reaches **8%** speed loss (null if slope ≤ 0) |
| t_star_days | double | Yes | `T* = √(2K/β)` — cost-rate-minimising cycle length (days) |
| fouling_rate_pct_per_day | double | Yes | open-cycle segment slope (%/day) |
| net_saving_usd | double | Yes | `∫_{T*}^{trigger}(c(t) − J*) dt` — saving vs cleaning at the trigger; null unless a trigger ETA exists beyond T* |
| status | string | No | `ok` / `insufficient_history` (degeneracy: <30 priced points, β ≤ 0, CI straddles 0, or no K) |

8 body columns, unpartitioned.

## Example queries
```sql
-- Canned `vessel_recommendation` (verbatim shape; ? bind shown as a literal)
SELECT last_cleaning_date, recommended_clean_date, trigger_eta, t_star_days,
       fouling_rate_pct_per_day, net_saving_usd, status
FROM fact_recommendation
WHERE imo_number = '9700006';

-- Fleet cleaning plan ranked by net saving (small flat table)
SELECT imo_number, recommended_clean_date, trigger_eta, t_star_days,
       net_saving_usd, status
FROM fact_recommendation
WHERE status = 'ok'
ORDER BY net_saving_usd DESC;
```

## Joins
- `fact_recommendation ⋈ fact_performance_daily` ON `imo_number` — relate the
  recommended cycle length / trigger ETA to the vessel's daily speed-loss trend.
- `fact_recommendation ⋈ dim_vessel` ON `imo_number` for particulars.
- Note: production canned queries are single-table (one row/vessel); the
  recommendation is computed in M3 from the daily fact and maintenance history.

```sql
-- Recommendation ⋈ that vessel's latest observed speed loss
SELECT r.imo_number, r.recommended_clean_date, r.trigger_eta, r.net_saving_usd,
       d.report_date, d.speed_loss_pct
FROM fact_recommendation r
JOIN fact_performance_daily d
  ON r.imo_number = d.imo_number
WHERE r.imo_number = '9700006' AND d.valid_flag = true
ORDER BY CAST(d.report_date AS date) DESC
LIMIT 1;
```
