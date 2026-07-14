---
name: dim_vessel
description: curated M2 · vessel · unpartitioned. Vessel dimension — identical 21 cols to raw vessel_master (incl. fleet_id/fleet_name) but with last_dry_dock_date filled. Backs the Dashboard roster + fleet dropdown.
---

# dim_vessel

## Description
Curated zone (M2). Grain: **one row per vessel** (dimension). Produced by the
`ym_datalake.etl` M2 pipeline. **Identical schema to raw `vessel_master`** (same
21 columns, incl. `fleet_id`/`fleet_name`), but `last_dry_dock_date` is **filled**
from the vessel's latest `dry_dock` event (raw often leaves it null). `imo_number`
is a 7-digit string. Unpartitioned, small flat table (9 rows). Backs the Dashboard
`fleet_vessels` roster, the `fleet_list` grouping dropdown, and the
`fleet_overview` KPI/table/map.

## Location & partitioning
- Glue DB `ym_hackathon`, workgroup `ym-hackathon`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/dim_vessel/dim_vessel.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix; full scan is cheap — 9 rows)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (7-digit string, key) |
| vessel_name | string | No | vessel name |
| vessel_type | string | No | `container` |
| fleet_id | string | No | operational fleet id (`FL-IA` / `FL-TP` / `FL-AE`) |
| fleet_name | string | No | operational fleet name (`Intra-Asia` / `Trans-Pacific` / `Asia-Europe`) |
| build_year | int | No | year built |
| lpp_m | double | No | length between perpendiculars (m) |
| breadth_m | double | No | moulded breadth B (m) |
| design_draft_m | double | No | design draft (m) |
| dwt | double | No | deadweight tonnage (t); CII capacity |
| gross_tonnage | double | No | gross tonnage |
| mcr_kw | double | No | maximum continuous rating (kW) |
| ncr_kw | double | No | normal continuous rating (kW) ≈ 0.85·MCR |
| design_speed_kn | double | No | design/contract speed Vdes (kn) |
| propeller_type | string | No | `FPP` (fixed-pitch propeller) |
| diameter_m | double | No | propeller diameter (m) |
| pitch_m | double | No | propeller pitch (m) |
| n_blades | int | No | number of propeller blades |
| transverse_area_m2 | double | No | transverse windage area A_XV (m²) |
| ref_curve_id | string | No | FK → `dim_reference_curve.ref_curve_id` (`RC-<imo>`) |
| last_dry_dock_date | string | No | last dry-dock date; **filled here** from the latest `dry_dock` event |

21 columns, unpartitioned (same as `vessel_master`; only `last_dry_dock_date` is
populated in practice). Fleet assignment: `FL-IA` 9700001–3, `FL-TP` 9700004/5/8,
`FL-AE` 9700006/7/9.

## Example queries
```sql
-- Canned `fleet_vessels` (verbatim shape) — roster + deep-dive header specs + fleet
SELECT imo_number, vessel_name, vessel_type, build_year, lpp_m, breadth_m,
       dwt, mcr_kw, design_speed_kn, last_dry_dock_date, fleet_id, fleet_name
FROM dim_vessel
ORDER BY imo_number;

-- Canned `fleet_list` — distinct operational fleets for the grouping dropdown
SELECT DISTINCT fleet_id, fleet_name FROM dim_vessel ORDER BY fleet_id;

-- Fleet dimension for the KPI/table/map
SELECT imo_number, vessel_name, dwt, design_speed_kn, last_dry_dock_date
FROM dim_vessel
ORDER BY imo_number;
```

## Joins
- `dim_vessel ⋈ dim_reference_curve` ON `ref_curve_id` (or `imo_number`) for the
  clean-hull curve.
- `dim_vessel ⋈ fact_performance_daily` / `agg_fleet_daily` ON `imo_number` (and
  `report_date` where the fleet aggregate is joined per day).
- Note: `fleet_overview` and `fleet_vessels` are separate single-table canned
  queries; the Dashboard stitches roster + aggregate client-side.

```sql
-- Roster ⋈ each vessel's reference curve span
SELECT v.imo_number, v.vessel_name, v.design_speed_kn,
       min(r.speed_kn) AS v_min, max(r.speed_kn) AS v_max
FROM dim_vessel v
JOIN dim_reference_curve r ON v.ref_curve_id = r.ref_curve_id
GROUP BY v.imo_number, v.vessel_name, v.design_speed_kn
ORDER BY v.imo_number;
```
