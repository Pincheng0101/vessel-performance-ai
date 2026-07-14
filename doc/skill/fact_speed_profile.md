---
name: fact_speed_profile
description: curated M2 · vessel × speed-grid point · partitions imo_number. Bunker/slow-steaming optimizer — convex usd/nm-vs-speed curve, fuel decomposition, economical speed (argmin, interior per C19).
---

# fact_speed_profile

## Description
Curated zone (M2, Phase 2). Grain: **one row per `(imo_number, speed_kn)`** — 24
speed-grid points per vessel spanning **0.5 → 1.0 of design speed**. Produced by
`ym_datalake.etl` (`optimize.py::build_speed_profiles`): for each vessel it sweeps
the reference speed-power curve (`curves.build_curve`) at the reference
displacement, inflates the clean power by the **latest** fouling state
(`P_fouled = P_clean / (1 − s)^n`, `s` = latest valid `speed_loss_pct/100`),
prices the fouled fuel burn at the latest bunker price, and adds the vessel's
per-day **charter (hire) cost**. The resulting `usd_per_nm` is **convex** — a
fuel-only curve rises monotonically with speed (its min would be the slowest grid
point, degenerate), so the per-day time cost is what creates an interior
*economical speed*. `recommended_speed_kn` is the `usd_per_nm` argmin and is
strictly interior to the grid (**C19**). Deterministic — no RNG, no ground truth.
`imo_number` is a 7-digit string. Backs the Dashboard `vessel_speed_profile`
Optimizer page (usd/nm curve, current/economical/schedule markers, live savings,
fleet slow-steaming KPI).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_speed_profile/imo_number=<imo>/data.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- Partition keys (projection): **`imo_number`** (enum, 9 IMOs). Always add
  `WHERE imo_number=…`.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | *(partition)* IMO number (7-digit string) |
| speed_kn | double | No | grid speed (kn); 24 points, `0.5·V_design … 1.0·V_design` |
| shaft_power_kw | double | No | clean-hull shaft power at this speed and the reference displacement (`curve.clean_power_kw`) |
| foc_mt_per_day | double | No | fouling-inflated daily fuel burn `physics.foc_mt(P_fouled, sfoc, 24)` (mt/day) |
| co2_mt_per_day | double | No | `foc_mt_per_day × carbon_factor(fuel_type)` (mt/day) |
| fuel_usd_per_day | double | No | `foc_mt_per_day × latest bunker price` (USD/day) |
| charter_usd_per_day | double | No | per-vessel charter/hire rate (USD/day); static `VesselSpec` particular (the time cost) |
| usd_per_day | double | No | `fuel_usd_per_day + charter_usd_per_day` (USD/day, total) |
| usd_per_nm | double | No | **total** unit-distance cost `usd_per_day / (speed_kn·24)` — convex, min = economical speed |
| fuel_usd_per_nm | double | No | fuel-only unit-distance cost `fuel_usd_per_day / (speed_kn·24)` — strictly increasing (decomposition) |
| vessel_name | string | No | vessel name *(repeated on every grid row)* |
| recommended_speed_kn | double | No | economical speed = `usd_per_nm` argmin (interior, C19) *(repeated)* |
| current_speed_kn | double | Yes | latest valid `speed_corrected_kn` (kn) *(repeated; null if no valid at-sea point)* |
| annual_distance_nm | double | No | Σ daily `distance_og_nm` annualised over the noon date span (nm/yr) *(repeated)* |

13 body columns + 1 partition key. The four vessel-level fields (`vessel_name`,
`recommended_speed_kn`, `current_speed_kn`, `annual_distance_nm`) are **identical
on all 24 rows** of a vessel (same trick as `fact_voyage.vessel_name`). To pull
one economical-speed row per vessel, filter `speed_kn = recommended_speed_kn`.

## Example queries
```sql
-- Canned `vessel_speed_profile` (verbatim shape; ? bind shown as a literal)
SELECT speed_kn, shaft_power_kw, foc_mt_per_day, co2_mt_per_day, fuel_usd_per_day,
       charter_usd_per_day, usd_per_day, usd_per_nm, fuel_usd_per_nm, vessel_name,
       recommended_speed_kn, current_speed_kn, annual_distance_nm
FROM fact_speed_profile
WHERE imo_number = '9700006'
ORDER BY speed_kn;

-- Economical speed + its unit cost for one vessel (single row)
SELECT vessel_name, recommended_speed_kn, usd_per_nm AS econ_usd_per_nm
FROM fact_speed_profile
WHERE imo_number = '9700006' AND speed_kn = recommended_speed_kn;

-- Slow-steaming saving vs sailing at the current speed, annualised
SELECT vessel_name,
       max(CASE WHEN speed_kn = recommended_speed_kn THEN usd_per_nm END) AS econ,
       -- current usd/nm approximated by the nearest grid point to current_speed_kn
       annual_distance_nm
FROM fact_speed_profile
WHERE imo_number = '9700006'
GROUP BY vessel_name, annual_distance_nm, recommended_speed_kn;
```

## Joins
- `fact_speed_profile ⋈ dim_vessel` ON `imo_number` — design speed / dwt / class
  (e.g. express `recommended_speed_kn` as a fraction of `design_speed_kn`).
- `fact_speed_profile ⋈ fact_performance_daily` ON `imo_number` — compare the
  optimizer's `current_speed_kn` against the daily corrected-speed series.
- `fact_speed_profile ⋈ fact_voyage` ON `imo_number` — set an achieved voyage
  `avg_speed_kn` against the economical speed for the same hull.
- Note: production canned queries are single-table; cross-table stitching happens
  in ETL or client-side.

```sql
-- Economical speed as a fraction of design speed (⋈ dim_vessel)
SELECT sp.vessel_name, sp.recommended_speed_kn, v.design_speed_kn,
       sp.recommended_speed_kn / v.design_speed_kn AS frac_of_design
FROM fact_speed_profile sp
JOIN dim_vessel v ON sp.imo_number = v.imo_number
WHERE sp.imo_number = '9700006' AND sp.speed_kn = sp.recommended_speed_kn;
```
