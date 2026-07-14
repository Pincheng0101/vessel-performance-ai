---
name: fact_voyage
description: curated M2 · vessel × voyage (rotation leg) · partitions imo_number. Per-voyage economics — distance, FOC, fuel cost, CO2, speed loss, $/nm, on-time. Conserves fuel exactly (C18).
---

# fact_voyage

## Description
Curated zone (M2). Grain: **one row per `(imo_number, voyage_no)`** — one
port-rotation leg **incl. its in-port day** (the voyage a vessel is on between two
ports). Produced by `ym_datalake.etl` (`voyages.py::build_voyages`), which groups
the raw Noon Report by `(imo, voyage_no)` and rolls it up: distance / FOC / CO₂
**sum the raw daily values**, so the per-vessel energy balance is exact (**C18**),
fuel cost prices each day at its own `(date, fuel_type)`, and `planned_eta` /
`on_time_flag` derive from the bent great-circle path length at 85 % of design
speed. `imo_number` is a 7-digit string. Backs the Dashboard `vessel_voyages`
sortable voyage-economics table.

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_voyage/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| voyage_no | string | No | voyage number (the rotation-leg id); joins `fact_performance_daily.voyage_no` |
| vessel_name | string | No | vessel name |
| from_port | string | No | departure UN/LOCODE (∈ `dim_port.locode`) |
| to_port | string | No | arrival UN/LOCODE (∈ `dim_port.locode`) |
| depart_date | string | No | min `report_date` of the group `YYYY-MM-DD` |
| arrive_date | string | No | max `report_date` of the group `YYYY-MM-DD` |
| distance_nm | double | No | Σ raw `distance_og_nm` over all rows |
| sea_days | int | No | count of at-sea rows |
| avg_speed_kn | double | Yes | `distance_nm / Σ steaming_hours` (null on zero steaming) |
| total_foc_mt | double | No | Σ raw `total_foc_mt` over **all** rows (at-sea + in-port) → C18-exact |
| fuel_cost_usd | double | No | Σ (`total_foc_mt` × `fuel_price(date, fuel_type)`), each day priced by its own fuel type |
| co2_mt | double | No | Σ daily `co2_mt` keyed by `(imo, date)` — reconciles with `fact_performance_daily` |
| avg_speed_loss_pct | double | Yes | mean of at-sea daily non-null `speed_loss_pct` (null if none) |
| usd_per_nm | double | Yes | `fuel_cost_usd / distance_nm` (null on zero distance) |
| on_time_flag | boolean | No | `(arrive − depart).days ≤ planned days` |
| planned_eta | string | No | `depart + round(path_nm / (0.85 · design_speed · 24))` days (service speed = 85 % of design) |

16 body columns + 1 partition key. `planned_eta` is the only field that touches
geography (bent great-circle `route_path` length); actual distance/FOC/CO₂ key off
the reported daily values.

## Example queries
```sql
-- Canned `vessel_voyages` (verbatim shape; ? bind shown as a literal)
SELECT voyage_no, vessel_name, from_port, to_port, depart_date, arrive_date,
       distance_nm, sea_days, avg_speed_kn, total_foc_mt, fuel_cost_usd, co2_mt,
       avg_speed_loss_pct, usd_per_nm, on_time_flag, planned_eta
FROM fact_voyage
WHERE imo_number = '9700006'
ORDER BY depart_date;

-- Costliest voyages by fuel $/nm for one vessel
SELECT voyage_no, from_port, to_port, distance_nm, usd_per_nm, on_time_flag
FROM fact_voyage
WHERE imo_number = '9700006'
ORDER BY usd_per_nm DESC
LIMIT 10;

-- On-time rate for one vessel
SELECT count(*) AS voyages,
       sum(CASE WHEN on_time_flag THEN 1 ELSE 0 END) AS on_time
FROM fact_voyage
WHERE imo_number = '9700006';
```

## Joins
- `fact_voyage ⋈ dim_port` ON `from_port = locode` (or `to_port = locode`) — port
  name / coordinates / `is_eu` for a leg.
- `fact_voyage ⋈ fact_performance_daily` ON `(imo_number, voyage_no)` — expand a
  voyage back into its constituent daily rows.
- `fact_voyage ⋈ dim_vessel` ON `imo_number` — vessel specs (design speed, dwt).
- Note: production canned queries are single-table; cross-table stitching happens
  in ETL or client-side.

```sql
-- Voyage economics ⋈ port names (both ends)
SELECT v.voyage_no, pf.name AS from_name, pt.name AS to_name,
       v.distance_nm, v.total_foc_mt, v.fuel_cost_usd, v.on_time_flag
FROM fact_voyage v
JOIN dim_port pf ON v.from_port = pf.locode
JOIN dim_port pt ON v.to_port = pt.locode
WHERE v.imo_number = '9700006'
ORDER BY CAST(v.depart_date AS date);
```
