---
name: ym_datalake_poc skill index
description: Per-table skill docs for the ym_datalake_poc Athena data lake — one self-contained file per table for text→SQL. Start here.
---

# `ym_datalake_poc` — per-table skill docs

One self-contained English "skill" file per Athena table in the `ym_datalake_poc`
data lake. Each file gives a table's purpose, full schema (every column, type,
nullability, meaning), how to query it with **partition pruning**, and how it
joins to the other 19 tables. Use these to write correct Athena SQL (text→SQL)
against the lake.

## Catalog coordinates

| Setting | Value |
|---|---|
| Glue database | `ym_datalake_poc` |
| Athena catalog | `AwsDataCatalog` |
| Athena workgroup | `ym-datalake-poc` (enforces its own result location) |
| Region | `us-west-2` |

All 20 tables are `EXTERNAL_TABLE`s over **JSONL** (one JSON object per line),
read with OpenX `org.openx.data.jsonserde.JsonSerDe` and Glue table parameter
`classification=json` — **not** Parquet. The SerDe maps JSON keys to columns
**by name**, so a redundant body key that is also a partition column is ignored.

**Partition-projection reminder.** 9 tables use Hive partition projection (no
crawler, no `MSCK`). **Always add a partition predicate** so Athena prunes the
scan: `WHERE imo_number='9700006'` (and `AND year=… [AND month=…]` on
`noon_report` / `fact_performance_daily`). `imo_number` is a **7-digit string**
and the universal join key. All temporal fields are strings — `CAST(col AS date)`
(or `timestamp`) for ordering/arithmetic. Non-finite floats (NaN/Inf) are `null`;
many ISO/derived columns are null in-port / on outliers (see each file).

## Tables

| # | Table | Zone / milestone | Grain | Partition keys | Body cols |
|---|---|---|---|---|---|
| 1 | [`noon_report`](noon_report.md) | raw / M1 | vessel × day | imo_number, year | 47 |
| 2 | [`vessel_master`](vessel_master.md) | raw / M1 | vessel | — | 21 |
| 3 | [`reference_curve`](reference_curve.md) | raw / M1 | vessel × speed point | — | 5 |
| 4 | [`uwi`](uwi.md) | raw / M1 | inspection | — | 11 |
| 5 | [`maintenance_event`](maintenance_event.md) | raw / M1 | event | — | 7 |
| 6 | [`fuel_price`](fuel_price.md) | raw / M1 | day × fuel | — | 3 |
| 7 | [`fact_performance_daily`](fact_performance_daily.md) | curated / M2 | vessel × day | imo_number, year, month | 35 |
| 8 | [`fact_performance_indicator`](fact_performance_indicator.md) | curated / M2 | vessel × indicator | imo_number | 8 |
| 9 | [`fact_uwi`](fact_uwi.md) | curated / M2 | inspection | imo_number | 10 |
| 10 | [`fact_maintenance_event`](fact_maintenance_event.md) | curated / M2 (+M3 cols) | event | imo_number | 8 |
| 11 | [`dim_vessel`](dim_vessel.md) | curated / M2 | vessel | — | 21 |
| 12 | [`dim_reference_curve`](dim_reference_curve.md) | curated / M2 | vessel × speed point | — | 5 |
| 13 | [`agg_fleet_daily`](agg_fleet_daily.md) | curated / M2 (+M3 col) | fleet × day (`ALL` + sub-fleets) | — | 13 |
| 14 | [`fact_recommendation`](fact_recommendation.md) | curated / M3 | vessel | — | 8 |
| 15 | [`fact_anomaly`](fact_anomaly.md) | curated / M3 | flagged (vessel, day) | imo_number | 6 |
| 16 | [`fact_maintenance_recommendation`](fact_maintenance_recommendation.md) | curated / M3 | vessel × action | — | 15 |
| 17 | [`fact_alert`](fact_alert.md) | curated / M3 | alert episode (vessel × episode) | imo_number | 15 |
| 18 | [`fact_voyage`](fact_voyage.md) | curated / M2 | vessel × voyage (rotation leg) | imo_number | 16 |
| 19 | [`dim_port`](dim_port.md) | curated / M2 | port | — | 5 |
| 20 | [`fact_speed_profile`](fact_speed_profile.md) | curated / M2 (Phase 2) | vessel × speed-grid point | imo_number | 13 |

> **Flat tables (no partition):** `agg_fleet_daily` has **no `imo_number`** at all
> (grain = (fleet, day); `fleet_id`/`year`/`month` are body columns — **always
> filter `fleet_id`**, e.g. `WHERE fleet_id='ALL'`, or a scan double-counts the
> rollup against its sub-fleets). `fact_recommendation` and
> `fact_maintenance_recommendation` keep `imo_number` as a **body column**, not a
> partition. Filtering these body columns is fine but does **not** prune S3.
>
> **Trigger threshold = 8.0%** (`periods.MT_TRIGGER_PCT = 8.0`), authoritative for
> `fact_performance_indicator.indicator=MT` and `fact_recommendation.trigger_eta`.
> Prose sometimes says ~10%; the **8% code value wins** for the data here.

## Fleet

9 synthetic **7-digit** IMOs `9700001`–`9700009`, container ships Feeder→ULCV.
**`9700006` = YM WELLNESS** is the Dashboard deep-dive vessel (engineered
fouling-rise → 8% threshold → clean → recover storyline). Data spans
**2021-07-01 … 2026-06-30** (5 years). 3 operational fleets group the vessels
(`fleet_id`/`fleet_name` on `vessel_master`/`dim_vessel`; `agg_fleet_daily` adds an
`ALL` rollup grain).

| IMO | Name | Class | Fleet |
|---|---|---|---|
| 9700001 | YM HARMONY | Feeder | FL-IA (Intra-Asia) |
| 9700002 | YM ENLIGHTEN | Feedermax | FL-IA |
| 9700003 | YM PLENTY | Panamax (scrubber) | FL-IA |
| 9700004 | YM PROSPER | Panamax | FL-TP (Trans-Pacific) |
| 9700005 | YM EXCELLENCE | Post-Panamax | FL-TP |
| **9700006** | **YM WELLNESS** | **Neo-Panamax (deep-dive)** | **FL-AE (Asia-Europe)** |
| 9700007 | YM WARRANTY | Neo-Panamax | FL-AE |
| 9700008 | YM TRIUMPH | Post-Panamax | FL-TP |
| 9700009 | YM TITAN | ULCV (scrubber) | FL-AE |

## Dashboard `query_type` ↔ table mapping

The async query API (`lambda_function/async_query_api/queries.py`) exposes
allow-listed `query_type`s; each is a **single-table** SQL builder (except
`vessel_speed_power`, a two-table `UNION ALL`). Cross-table joins live in the M2
ETL or are stitched client-side.

| Dashboard component | `query_type` | Primary tables |
|---|---|---|
| Fleet KPI / table / map (fleet-scoped) | `fleet_overview` | [`agg_fleet_daily`](agg_fleet_daily.md) |
| Fleet roster | `fleet_vessels` | [`dim_vessel`](dim_vessel.md) |
| Fleet grouping dropdown | `fleet_list` | [`dim_vessel`](dim_vessel.md) |
| Fleet alert feed / "Active alerts" KPI | `fleet_alerts` | [`fact_alert`](fact_alert.md) |
| Speed-loss trend + events | `vessel_speed_loss` | [`fact_performance_daily`](fact_performance_daily.md), [`fact_maintenance_event`](fact_maintenance_event.md), [`fact_uwi`](fact_uwi.md) |
| Deep-dive metric panels | `vessel_metrics` | [`fact_performance_daily`](fact_performance_daily.md) |
| Speed–power scatter | `vessel_speed_power` | [`fact_performance_daily`](fact_performance_daily.md), [`dim_reference_curve`](dim_reference_curve.md) |
| Anomaly timeline | `vessel_anomalies` | [`fact_anomaly`](fact_anomaly.md) |
| Vessel alert panel | `vessel_alerts` | [`fact_alert`](fact_alert.md) |
| Maintenance effect | `vessel_maintenance_effect` | [`fact_maintenance_event`](fact_maintenance_event.md) |
| Hull-cleaning optimization (t*/net saving) | `vessel_recommendation` | [`fact_recommendation`](fact_recommendation.md) |
| Maintenance recommendations (action list / fleet next action) | `vessel_maintenance_recommendation` | [`fact_maintenance_recommendation`](fact_maintenance_recommendation.md) |
| Latest inspection panel | `vessel_uwi` | [`fact_uwi`](fact_uwi.md) |
| Fleet Map — one dot per vessel (latest position) | `fleet_positions` | [`fact_performance_daily`](fact_performance_daily.md) |
| Deep-dive per-vessel track map | `vessel_track` | [`fact_performance_daily`](fact_performance_daily.md) |
| Deep-dive sortable voyage-economics table | `vessel_voyages` | [`fact_voyage`](fact_voyage.md) |
| Optimizer — usd/nm-vs-speed curve, economical speed, savings | `vessel_speed_profile` | [`fact_speed_profile`](fact_speed_profile.md) |

## Source of truth

- Types / partitions: `deployment/athena_tool_stack.py` (`*_COLUMNS`, `CfnTable` defs)
- Column meanings + enums: `doc/table-schema.md`
- Canned SQL: `lambda_function/async_query_api/queries.py`
