---
name: vessel_master
description: raw M1 · vessel · unpartitioned. Static vessel particulars (hull/propeller/engine dims + ref_curve_id FK) — the raw fleet dimension.
---

# vessel_master

## Description
Raw zone (M1). Grain: **one row per vessel** (dimension). Produced by the
`ym_datalake.synthetic_data` generator. Static particulars: principal hull
dimensions, propeller geometry, engine ratings, and the `ref_curve_id` FK to the
vessel's clean-hull speed–power curve. `imo_number` is a **7-digit string** key.
`last_dry_dock_date` is **null in raw** when unknown — the curated `dim_vessel`
mirror fills it from the vessel's latest `dry_dock` event; otherwise the two
tables are identical (same 21 columns). `fleet_id`/`fleet_name` assign each vessel
to an operational fleet (`FL-IA`/`FL-TP`/`FL-AE`). Unpartitioned, small flat table
(9 rows).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/vessel_master/vessel_master.jsonl`
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
| transverse_area_m2 | double | No | transverse windage area A_XV (m²), for wind resistance |
| ref_curve_id | string | No | FK → `reference_curve.ref_curve_id` (`RC-<imo>`) |
| last_dry_dock_date | string | Yes | last dry-dock date; **null in raw** when unknown (`dim_vessel` fills it) |

21 columns, unpartitioned. Fleet assignment: `FL-IA` 9700001–3, `FL-TP`
9700004/5/8, `FL-AE` 9700006/7/9.

## Example queries
```sql
-- Fleet particulars (full scan — small flat table)
SELECT imo_number, vessel_name, vessel_type, build_year, dwt, design_speed_kn, ref_curve_id
FROM vessel_master
ORDER BY imo_number;

-- One vessel's geometry (drives resistance / reference-curve lookups)
SELECT imo_number, lpp_m, breadth_m, design_draft_m, transverse_area_m2, mcr_kw, ncr_kw
FROM vessel_master
WHERE imo_number = '9700006';
```

## Joins
`imo_number` (7-digit string) is the universal join key; `ref_curve_id` joins to
the reference curve.
- `vessel_master ⋈ reference_curve` ON `ref_curve_id` (also resolvable ON `imo_number`).
- Every raw fact table (`noon_report`, `uwi`, `maintenance_event`) joins back to
  `vessel_master` ON `imo_number` for particulars.
- Note: production canned queries are single-table; the curated `dim_vessel` (not
  this raw table) backs the Dashboard `fleet_vessels` / `fleet_overview` roster.

```sql
-- Vessel particulars ⋈ its clean-hull reference curve
SELECT vm.imo_number, vm.vessel_name, vm.design_speed_kn,
       rc.speed_kn, rc.shaft_power_kw
FROM vessel_master vm
JOIN reference_curve rc ON vm.ref_curve_id = rc.ref_curve_id
WHERE vm.imo_number = '9700006'
ORDER BY rc.speed_kn;
```
