---
name: fuel_price
description: raw M1 · day × fuel · unpartitioned. Daily bunker prices per fuel type (random walk) — priced into M2 excess-fuel cost by (date, fuel_type).
---

# fuel_price

## Description
Raw zone (M1). Grain: **one row per day per fuel type** (a random walk). Produced
by the `ym_datalake.synthetic_data` generator. Joined by **`(date, fuel_type)`**
in the M2 ETL to convert excess fuel burned to fouling into
`fact_performance_daily.excess_cost_usd`. Unpartitioned. This is a leaf reference
table with no `imo_number` — it keys only on `(date, fuel_type)`.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/fuel_price/fuel_price.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| date | string | No | `YYYY-MM-DD` |
| fuel_type | string | No | `HFO` / `VLSFO` / `MGO` |
| price_usd_per_mt | double | No | bunker price (USD/t) |

3 columns, unpartitioned. Natural key: `(date, fuel_type)`.

## Example queries
```sql
-- Price series for one fuel type, chronological
SELECT date, price_usd_per_mt
FROM fuel_price
WHERE fuel_type = 'VLSFO'
ORDER BY CAST(date AS date);

-- Monthly average price by fuel type
SELECT substr(date, 1, 7) AS month, fuel_type, round(avg(price_usd_per_mt), 2) AS avg_price
FROM fuel_price
GROUP BY substr(date, 1, 7), fuel_type
ORDER BY month, fuel_type;
```

## Joins
Leaf reference table — no `imo_number` and no meaningful cross-fact join beyond
its `(date, fuel_type)` key. It is joined to a per-vessel daily record on that key
to price fuel (see `noon_report.md` for the `noon_report ⋈ fuel_price` example on
`substr(report_datetime_utc,1,10) = date AND fuel_type`). Note: production canned
queries are single-table; fuel pricing happens inside the M2 ETL, not the query
Lambda.

Carbon factors used downstream (from `synthetic_data/physics.py`, for context):
HFO 3.114, VLSFO 3.151, MGO 3.206 tCO₂/t.
