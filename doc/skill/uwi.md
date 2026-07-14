---
name: uwi
description: raw M1 · inspection · unpartitioned. Underwater (hull/propeller) inspection findings — ground-truth fouling state.
---

# uwi

## Description
Raw zone (M1). Grain: **one row per underwater inspection**. Produced by the
`ym_datalake.synthetic_data` generator. `hull_fouling_rating` /
`hull_fouling_coverage_pct` track the true injected hull-fouling speed loss (the
observational check on the hull). The propeller and coating signals are
**independent, resettable processes** (not derived from hull fouling):
`propeller_roughness_um` rises with days since the last propeller_polishing/dry
dock and bands into `propeller_condition` (Rubert); `coating_breakdown_pct` rises
with days since the last coating_renewal/dry dock and bands into
`coating_condition`. `imo_number` is a 7-digit string; `inspection_id` =
`UWI-<imo>-<date>`. Unpartitioned. The curated `fact_uwi` is a pass-through
mirror, minus the `imo_number` body key (which becomes its partition).

## Location & partitioning
- Glue DB `ym_datalake_poc`, workgroup `ym-datalake-poc`, region us-west-2
- S3: `s3://<DataLakeBucket>/raw/uwi/uwi.jsonl`
- Format: JSONL, OpenX `org.openx.data.jsonserde.JsonSerDe`, `classification=json`
- **Unpartitioned** (single flat prefix)

## Schema
| Column | Type | Null? | Description |
|---|---|---|---|
| inspection_id | string | No | `UWI-<imo>-<date>` |
| imo_number | string | No | FK → vessel (7-digit string) |
| inspection_date | string | No | `YYYY-MM-DD` |
| inspection_type | string | No | `diver` / `ROV` / `UWI` |
| hull_fouling_rating | int | No | hull-fouling rating (higher = more fouled) |
| hull_fouling_coverage_pct | double | No | % of hull area fouled |
| propeller_condition | string | No | Rubert scale `A`–`F` (A = smoothest/best), banded from `propeller_roughness_um` |
| propeller_roughness_um | double | No | propeller surface roughness (µm), independent of hull fouling; ~150 (clean) → 600 |
| coating_breakdown_pct | double | No | anti-fouling coating breakdown 0–100 %, independent of hull fouling |
| coating_condition | string | No | `good` (<20%) / `fair` (20–45%) / `poor` (≥45%), banded from `coating_breakdown_pct` |
| recommended_action | string | No | `none` / `polish` / `clean` (hull-rating driven) |

11 columns, unpartitioned.

## Example queries
```sql
-- All inspections for one vessel, chronological
SELECT inspection_date, inspection_type, hull_fouling_rating,
       hull_fouling_coverage_pct, propeller_condition, recommended_action
FROM uwi
WHERE imo_number = '9700006'
ORDER BY CAST(inspection_date AS date);

-- Fleet inspections that recommended a clean
SELECT imo_number, inspection_date, hull_fouling_rating, coating_condition
FROM uwi
WHERE recommended_action = 'clean'
ORDER BY imo_number, CAST(inspection_date AS date);
```

## Joins
- `uwi ⋈ vessel_master` ON `imo_number` for particulars.
- `uwi ⋈ noon_report` ON `imo_number` (align an inspection to the operating
  record near `inspection_date` to corroborate observed vs measured speed loss).
- Note: production canned queries are single-table; the Dashboard reads the
  curated `fact_uwi` (not raw `uwi`) in the `vessel_speed_loss` event overlay.
