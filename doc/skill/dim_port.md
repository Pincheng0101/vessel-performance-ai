---
name: dim_port
description: curated M2 · port · unpartitioned. 10-row port dimension (locode, name, lat, lon, is_eu) from ports.PORTS. Server-side join target; is_eu marks Rotterdam + Hamburg only.
---

# dim_port

## Description
Curated zone (M2). Grain: **one row per port** (flat dimension). Produced by
`ym_datalake.etl` (`voyages.py::build_dim_port`) straight from
`synthetic_data/ports.py::PORTS`. Ten UN/LOCODEs with **real** coordinates.
`is_eu` is true **only** for the two European ports (Rotterdam + Hamburg) and
gates the Phase 3 EU-scope-from-ports join. Ships as a Glue table for
**server-side joins** (e.g. `fact_voyage.from_port → dim_port.locode`).

**Note:** the Dashboard map reads coordinates from `web/ports.js` (a static
mirror of `ports.py`), **not** from `dim_port`. `dim_port` exists for Athena /
server-side use.

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/dim_port/dim_port.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix; full scan is cheap — 10 rows)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| locode | string | No | UN/LOCODE (key), e.g. `SGSIN`, `NLRTM` |
| name | string | No | port name |
| lat | double | No | port latitude (°) |
| lon | double | No | port longitude (°) |
| is_eu | boolean | No | EU port? true **only** for `NLRTM` (Rotterdam) and `DEHAM` (Hamburg) |

5 columns, unpartitioned. The 10 rows (LOCODE / name / lat / lon / is_eu):
`SGSIN` Singapore 1.27/103.83, `NLRTM` Rotterdam 51.95/4.14 **(EU)**, `KRPUS`
Busan 35.10/129.04, `CNSHA` Shanghai 31.23/121.50, `LKCMB` Colombo 6.95/79.85,
`AEDXB` Dubai 25.01/55.06, `USLAX` Los Angeles 33.74/−118.27, `DEHAM` Hamburg
53.53/9.92 **(EU)**, `JPTYO` Tokyo 35.62/139.77, `HKHKG` Hong Kong 22.30/114.17.

## Example queries
```sql
-- Full port dimension (small flat table)
SELECT locode, name, lat, lon, is_eu FROM dim_port ORDER BY locode;

-- EU ports only (Phase 3 EU-scope seed)
SELECT locode, name FROM dim_port WHERE is_eu = true;
```

## Joins
- `fact_voyage ⋈ dim_port` ON `from_port = locode` / `to_port = locode` — port
  name / coordinates / EU flag for a voyage leg.
- `fact_performance_daily ⋈ dim_port` ON `port_from = locode` / `port_to =
  locode` — resolve a daily row's ports.

```sql
-- Voyages departing or arriving at an EU port (Phase 3 EU-scope)
SELECT v.imo_number, v.voyage_no, v.from_port, v.to_port, v.co2_mt
FROM fact_voyage v
JOIN dim_port p ON p.locode IN (v.from_port, v.to_port)
WHERE p.is_eu = true
ORDER BY v.imo_number, CAST(v.depart_date AS date);
```
