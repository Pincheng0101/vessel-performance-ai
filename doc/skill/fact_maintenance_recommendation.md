---
name: fact_maintenance_recommendation
description: curated M3 · vessel × recommended action · unpartitioned (flat). Overall maintenance actions per vessel (hull cleaning / propeller polishing-repair / coating renewal / engine inspection), each with a predictive due_date, per-action analytics (degradation rate, threshold ETA, t*, net saving), and a consolidated service-window plan (plan_date / plan_service_type).
---

# fact_maintenance_recommendation

## Description
Curated zone (M3 — statistical insight). Grain: **one row per (vessel, recommended
action)** the vessel needs; a vessel with nothing due has **no rows** (empty ⇒ up to
date). Produced by the M3 stage `recommendation.recommend_actions`. **Flat /
unpartitioned**: `imo_number` is a **body column, not a partition**. Broadens the
hull-cleaning-only `fact_recommendation` into overall maintenance actions, each with a
genuine predictive `due_date`: for each action it fits the relevant degradation signal
over its own **reset clock** (from `fact_maintenance_event`) with a robust Theil-Sen
line and extrapolates the crossing of the action threshold; it also uses trailing
`fact_anomaly.cause` (last **180 days** before the vessel's latest report date) and the
fouling cost model (`fact_recommendation`). Every emitted action carries a `due_date` —
the forecast crossing when available, else a priority-horizon fallback (`high` +30d /
`medium` +90d), so it is effectively never null. A consolidated **planner**
(`plan_maintenance`) then batches the scattered due dates into shared service windows
(`plan_date` / `plan_service_type`). Backs the Dashboard
`vessel_maintenance_recommendation` panel (grouped windows + fleet "Next maintenance").

## Actions, signals & thresholds
Each action is triggered by an inspection/anomaly state **or** a trend forecast crossing
its threshold within the horizon; `due_date` = that forecast crossing (else horizon).

| Action | `plan_service_type` | Signal | Threshold | Priority / source | Economics |
|---|---|---|---|---|---|
| `hull_cleaning` | in_water | `speed_loss_pct` | 8 % | `high` if 8% trigger ETA ≤ ~60d or overdue, else `medium`; `fouling_model` (or `uwi` if rating ≥ 60) | ✓ fouling cost model (self-carried) |
| `propeller_polishing` | in_water | `propeller_roughness_um` | 300 µm | `medium`; `uwi`/`anomaly` | ✓ coefficient |
| `propeller_repair` | dry_dock | `propeller_roughness_um` | 430 µm | `high`; `uwi`/`anomaly` (suppresses polishing) | — rate + ETA only |
| `coating_renewal` | dry_dock | `coating_breakdown_pct` | 45 % | `medium`; `uwi` | ✓ coefficient |
| `engine_inspection` | in_water | `sfoc_g_kwh` drift | +5 % | `high` if anomaly/past-threshold else `medium`; `anomaly`/`sfoc_trend` | ✓ data-driven |

- **hull_cleaning** — from the cost model: if `recommended_clean_date` is still future,
  `due_date` = it; if past (**overdue**), `due_date` = the 8% trigger deadline / horizon
  and the rationale leads with `overdue`.
- **propeller_repair** — roughness ≥ 430 (Rubert E/F) or a high-severity `propeller`
  anomaly. **propeller_polishing** — else roughness ≥ 300 (Rubert C/D), a forecast
  crossing 300 µm within 180d, or ≥1 `propeller` anomaly.
- **coating_renewal** — `coating_condition=poor` (≥ 45%) or a forecast crossing 45%
  within 180d.
- **engine_inspection** — ≥1 `engine_degradation` anomaly in the 180-day window, or the
  current engine cycle's SFOC drift forecast (or already) exceeds +5%.

Reset clocks (from `fact_maintenance_event`, each ∪ `dry_dock`): propeller_polishing
(roughness), coating_renewal (coating breakdown), engine_overhaul (SFOC drift).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/curated/fact_maintenance_recommendation/fact_maintenance_recommendation.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix; 0–N rows/vessel). `imo_number` is a body
  column — filter it, but it does **not** prune S3.

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| imo_number | string | No | IMO number (7-digit string, **body column**) |
| action_type | string | No | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| priority | string | No | `high` / `medium` / `low` |
| due_date | string | Yes | `YYYY-MM-DD` forecast crossing, else priority-horizon fallback; set for every action (effectively never null) |
| rationale | string | No | short English evidence string (roughness + forecast date, anomaly count, …) |
| source | string | No | `uwi` / `anomaly` / `fouling_model` / `sfoc_trend` / `uwi+anomaly` — evidence stream(s) that triggered it |
| degradation_rate | double | Yes | Theil-Sen slope of the signal (per day); null when too thin to fit |
| degradation_unit | string | Yes | `%/day` (hull/coating/engine) or `µm/day` (propeller) |
| current_value | double | Yes | latest signal value (speed loss %, roughness µm, breakdown %, SFOC drift %) |
| threshold_value | double | Yes | 8 (hull), 300/430 (propeller polish/repair µm), 45 (coating %), 5 (engine SFOC %) |
| trigger_eta | string | Yes | `YYYY-MM-DD` forecast date the signal reaches `threshold_value` (null when flat/declining) |
| t_star_days | double | Yes | optimal service interval (days) minimising total cost; economic actions only |
| net_saving_usd | double | Yes | saving of servicing at `t*` vs waiting to threshold; economic actions only, > 0 when set |
| plan_date | string | Yes | `YYYY-MM-DD` planned date of the **batched service window** this action belongs to; shared across the window |
| plan_service_type | string | Yes | `dry_dock` / `in_water` — whether the window needs a haul-out; shared across the window |

15 body columns, unpartitioned.

## Per-action analytics
Every row self-carries the 4-metric strip the hull cost model exposes in
`fact_recommendation` — degradation rate, threshold ETA, and (economic actions) `t*` +
net saving — so the strip needs no join back. The economics reuse the hull math
`c(t)=α+βt`, `t*=√(2K/β)`, `net_saving=β·(trigger−t*)²/2` (> 0 when the trigger is later
than `t*`). Cost-rate slope β ($/day²):
- **engine (data-driven):** `β = foc_med·price_med·(sfoc_slope/sfoc_intercept)`.
- **propeller / coating (coefficient — POC assumption):** `β =
  foc_med·price_med·penalty·signal_rate`, with tunable `_PROP_PENALTY_PER_UM` (~3% power
  @ +150 µm) and `_COAT_PENALTY_PER_PCT` (~4% @ 45% breakdown) — documented modelling
  coefficients, decoupled from the synthetic FOC; tune during review.
- `foc_med` = median daily ME FOC (≈ `sfoc·power·24h`); `price_med` = median
  `excess_cost_usd/excess_foc_mt` (fleet-constant fallback).
- **K** = median full cost (cash + downtime) of that vessel's matching service events
  (fleet-median fallback). No K ⇒ rate + ETA only, no `t*`/net_saving.

## Consolidated planner (`plan_date` / `plan_service_type`)
`plan_maintenance` (run at the tail of `recommend_actions`) batches the scattered
per-action due dates into shared **service windows** so each vessel has a single **next
maintenance date** with the actions to do together. Service category: `coating_renewal`
/ `propeller_repair` → `dry_dock`; `hull_cleaning` / `propeller_polishing` /
`engine_inspection` → `in_water`. Batch tolerance `_PLAN_BATCH_DAYS = 60` (POC
assumption — tune to the ops standard). Greedy two-pass:
1. **Dry-dock actions** (due-sorted) open a window at the earliest unassigned action and
   absorb every dry-dock action with `due ≤ anchor + 60d`; window `plan_date` = the
   **earliest dry-dock due** (the dock is the constraining event, never pulled earlier
   by a folded-in in-water action).
2. **In-water actions** (due-sorted) fold into the nearest dry-dock window iff `|due −
   anchor| ≤ 60d`, else batch among themselves (window `plan_date` = earliest in-water
   due). An urgent in-water action far before a distant dock forms its own window.

A window's `plan_service_type` = `dry_dock` if it holds **any** dry-dock action, else
`in_water`; its display priority = max (high > medium > low) of its actions (derived
client-side). Rows sharing a `plan_date` share a `plan_service_type`. Next maintenance
date = `min(plan_date)`.

## Example queries
```sql
-- Canned `vessel_maintenance_recommendation` (verbatim shape).
-- Rows arrive grouped by service window (plan_date), then priority, then action_type.
SELECT action_type, priority, due_date, rationale, source,
       degradation_rate, degradation_unit, current_value, threshold_value,
       trigger_eta, t_star_days, net_saving_usd, plan_date, plan_service_type
FROM fact_maintenance_recommendation
WHERE imo_number = '9700006'
ORDER BY plan_date, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, action_type;

-- Fleet next-maintenance date per vessel (earliest window)
SELECT imo_number, min(plan_date) AS next_maintenance_date
FROM fact_maintenance_recommendation
GROUP BY imo_number
ORDER BY next_maintenance_date;

-- Vessels with no outstanding actions (anti-join — "up to date")
SELECT v.imo_number, v.vessel_name
FROM dim_vessel v
LEFT JOIN fact_maintenance_recommendation r ON v.imo_number = r.imo_number
WHERE r.imo_number IS NULL;

-- Canned `fleet_maintenance_recommendation` (Planner page, api.md §4.18): the fleet-wide
-- backlog with an indicative capex `est_cost_usd`. est_cost_usd is DERIVED AT QUERY TIME
-- (not a stored column): the median historical cost_usd of the matching maintenance
-- event_type. event_type = action_type 1:1 EXCEPT engine_inspection → engine_overhaul
-- (no pure-inspection event; overstates a bare inspection — indicative only).
SELECT r.imo_number, r.action_type, r.priority, r.due_date, r.plan_date, r.plan_service_type,
       r.net_saving_usd, e.est_cost_usd
FROM fact_maintenance_recommendation r
LEFT JOIN (
  SELECT event_type, approx_percentile(cost_usd, 0.5) AS est_cost_usd
  FROM fact_maintenance_event GROUP BY event_type
) e ON e.event_type = CASE r.action_type WHEN 'engine_inspection' THEN 'engine_overhaul'
                                          ELSE r.action_type END
ORDER BY r.plan_date, CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, r.action_type;
```

## Joins
- `⋈ fact_recommendation` ON `imo_number` — the hull row self-carries the
  T*/net_saving/trigger_eta economics; join only for the full fouling-model fields
  (`recommended_clean_date`, `status`).
- `⋈ fact_uwi` ON `imo_number` — corroborate a `propeller_*` / `coating_renewal` /
  `hull_cleaning` row against the latest inspection.
- `⋈ fact_anomaly` ON `imo_number` — the `engine_inspection` / anomaly-sourced rows count
  `cause` over the trailing 180 days.
- `⋈ fact_maintenance_event` ON `imo_number` — the reset clocks anchoring each forecast.
- `⋈ dim_vessel` ON `imo_number` for particulars.

```sql
-- Action list ⋈ that vessel's hull-cleaning economics
SELECT a.action_type, a.priority, a.due_date, a.source,
       r.t_star_days, r.trigger_eta, r.net_saving_usd
FROM fact_maintenance_recommendation a
LEFT JOIN fact_recommendation r ON a.imo_number = r.imo_number
WHERE a.imo_number = '9700006'
ORDER BY CASE a.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, a.action_type;
```
