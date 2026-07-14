# `ym_hackathon` — GenBI SQL Guide

Write Athena SQL against the YangMing vessel-performance data lake and run it with the
**`athena_query`** tool — pass one SELECT statement as `query`. The database
(`ym_hackathon`), workgroup, and catalog are pre-configured on the tool; reference
tables by bare name.

The lake holds **two tables**: `vt_fd` (daily Noon Report operational data) and
`maintenance` (hull/propeller inspection & maintenance events). Everything shares one
**relative-day timeline**: `vt_fd.noon_utc` and `maintenance.event_day` are integer days
counted from day 0 (≈ 5 years of data, day 0 … 1825). There are **no calendar dates** —
answer time questions in relative days (or convert: day ÷ 365 ≈ year offset).

## Hard rules

1. **`vt_fd` is partitioned by `ship_id` — always add `WHERE ship_id = 'S1'`** (or an
   explicit `IN` list) unless the question is genuinely fleet-wide.
2. `ship_id` is a **string** like `'S1'` … `'S12'`, `'S21'` … `'S23'` — quote it. It is the
   join key between the two tables; join windows with `noon_utc` vs `event_day`.
3. **Outliers exist** in raw speeds (e.g. `avg_speed` up to 97.8 kn on S2). For trends,
   filter to plausible ranges (e.g. `avg_speed BETWEEN 5 AND 30`) and/or
   `hours_total > 0`.
4. **Nulls**: `sfoc` is null on ~20% of rows; `horse_power` / `total_consump` on ~2%.
   Aggregate with explicit `WHERE col IS NOT NULL` when averaging.
5. **`masked_flag = true` rows (372) are the prediction targets**: their fuel-consumption
   value has been masked out for the hackathon task, and `predict_fuel_type` names which
   column to predict (`ME_FULLSPEED_CONSUMP_VLSFO` or `ME_FULLSPEED_CONSUMP_HSHFO`).
   **Exclude `masked_flag` rows from consumption statistics** (`WHERE NOT masked_flag`).
6. SELECT only, one statement per call, aggregate in SQL, add `LIMIT` (≤ 100 rows unless
   the user asks for more).

## Fleet

15 container ships, ~1,180–1,500 noon reports each (21,282 rows total), 17–26 voyages each:

`S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11 S12 S21 S22 S23`

(No S13–S20. S9 stops at day 1464; the rest run to ~day 1825.)

## Tables

### `vt_fd` — daily Noon Report (grain: ship × noon report; partitioned by `ship_id`)

| Column group | Columns |
|---|---|
| Identity / time | `ship_id` (partition), `voyage` (string voyage no.), `noon_utc` (int relative day) |
| Speed | `avg_speed` (SOG kn), `speed_through_water` (STW kn), `propeller_speed`, `me_avg_rpm` |
| Slip | `me_slip`, `diff_stw_sog_slip`, `full_spd_stw_slip` |
| Draft / loading | `fore_draft`, `after_draft`, `mid_draft`, `displacement`, `cargo_on_board` |
| Weather / sea | `wind_scale` (Beaufort), `wind_speed`, `wind_direction`, `sea_height`, `sea_direction`, `swell_height`, `swell_direction`, `sea_water_temp`, `water_depth` |
| Distance / hours | `total_distance`, `sea_speed_distance`, `hours_full_speed`, `hours_total` |
| Engine / power | `horse_power`, `load_pct`, `sfoc` (g/kWh), `thrust`, `thrust_quotient` |
| Fuel consumption | `total_consump`, `me_consumption`, `me_fullspeed_consump_hshfo`, `me_fullspeed_consump_ulsfo`, `me_fullspeed_consump_vlsfo`, `me_fullspeed_consump_lsmgo`, `me_fullspeed_consump_bio_hsfo` (MT) |
| Hackathon task | `masked_flag` (boolean — true = consumption masked, to be predicted), `predict_fuel_type` (which consumption column is the target; null on normal rows) |

### `maintenance` — inspection & maintenance events (grain: event; 77 rows)

| Column | Meaning |
|---|---|
| `ship_id` | ship, joins to `vt_fd.ship_id` |
| `event_type` | `DD` dry dock (10) · `UWI` underwater inspection (12) · `UWC` underwater cleaning (6) · `PP` propeller polishing (11) · `UWI+PP` (31) · `UWC+PP` (7) |
| `event_day` | int relative day (same timeline as `noon_utc`), range 134–1804 |
| `propeller_condition` | `Good` / `Fair` / `Poor` / null |
| `hull_fouling_type` | comma list e.g. `barnacle,slime,algae`, `slime,calcium` — **inconsistent spacing**, match with `LIKE '%barnacle%'` not `=` |
| `hull_coating_condition` | `Good` / `Fair` / null |
| `cavitation_found` | `Yes` / `No` / null |
| `draft_fwd_m`, `draft_aft_m` | drafts at inspection |

Cleaning-type events (`DD`, `UWC`, `UWC+PP`, `PP`, `UWI+PP`) reset hull/propeller
degradation; `UWI` alone is inspection-only. "Days since last cleaning" for a noon report
= `noon_utc - max(event_day where event_day <= noon_utc)` for that ship.

## Query patterns

```sql
-- resolve fleet: which ships exist and their data span
SELECT ship_id, COUNT(*) n_reports, COUNT(DISTINCT voyage) n_voyages,
       MIN(noon_utc) first_day, MAX(noon_utc) last_day
FROM vt_fd GROUP BY ship_id ORDER BY ship_id

-- speed & consumption trend for one ship, bucketed by ~month (30-day bins)
SELECT noon_utc / 30 AS month_bin,
       ROUND(AVG(avg_speed), 2)  AS avg_sog_kn,
       ROUND(AVG(sfoc), 1)       AS avg_sfoc,
       ROUND(SUM(total_consump), 1) AS total_foc_mt
FROM vt_fd
WHERE ship_id = 'S1' AND NOT masked_flag
  AND avg_speed BETWEEN 5 AND 30 AND sfoc IS NOT NULL
GROUP BY 1 ORDER BY 1

-- maintenance history of one ship
SELECT event_day, event_type, propeller_condition, hull_fouling_type,
       hull_coating_condition, cavitation_found
FROM maintenance WHERE ship_id = 'S1' ORDER BY event_day

-- before/after effect of a maintenance event (±60-day windows)
SELECT CASE WHEN v.noon_utc < m.event_day THEN 'before' ELSE 'after' END AS phase,
       ROUND(AVG(v.sfoc), 1) AS avg_sfoc, ROUND(AVG(v.me_slip), 4) AS avg_slip,
       ROUND(AVG(v.avg_speed), 2) AS avg_sog
FROM vt_fd v
JOIN maintenance m ON m.ship_id = v.ship_id AND m.event_day = 981  -- pick the event
WHERE v.ship_id = 'S1' AND NOT v.masked_flag
  AND v.noon_utc BETWEEN m.event_day - 60 AND m.event_day + 60
  AND v.avg_speed BETWEEN 5 AND 30
GROUP BY 1

-- slip trend as a fouling proxy (rising slip ⇒ hull/propeller degradation)
SELECT noon_utc / 30 AS month_bin, ROUND(AVG(me_slip), 4) AS avg_slip
FROM vt_fd
WHERE ship_id = 'S1' AND NOT masked_flag AND me_slip IS NOT NULL
  AND avg_speed BETWEEN 8 AND 30
GROUP BY 1 ORDER BY 1

-- weather-normalized comparison: calm-sea rows only
SELECT ship_id, ROUND(AVG(sfoc), 1) AS calm_sfoc, COUNT(*) n
FROM vt_fd
WHERE NOT masked_flag AND wind_scale <= 3 AND sea_height <= 1.5
  AND sfoc IS NOT NULL AND avg_speed BETWEEN 8 AND 30
GROUP BY ship_id ORDER BY calm_sfoc DESC

-- the hackathon prediction targets
SELECT ship_id, COUNT(*) n_masked, predict_fuel_type
FROM vt_fd WHERE masked_flag GROUP BY ship_id, predict_fuel_type ORDER BY ship_id

-- fuel mix per ship (which fuels are actually burned)
SELECT ship_id,
       ROUND(SUM(me_fullspeed_consump_hshfo), 0) AS hshfo_mt,
       ROUND(SUM(me_fullspeed_consump_vlsfo), 0) AS vlsfo_mt,
       ROUND(SUM(me_fullspeed_consump_ulsfo), 0) AS ulsfo_mt,
       ROUND(SUM(me_fullspeed_consump_lsmgo), 0) AS lsmgo_mt,
       ROUND(SUM(me_fullspeed_consump_bio_hsfo), 0) AS bio_hsfo_mt
FROM vt_fd WHERE NOT masked_flag GROUP BY ship_id ORDER BY ship_id

-- days since last cleaning at each noon report (window trick)
SELECT v.ship_id, v.noon_utc,
       v.noon_utc - MAX(m.event_day) AS days_since_maintenance
FROM vt_fd v
JOIN maintenance m
  ON m.ship_id = v.ship_id AND m.event_day <= v.noon_utc
  AND m.event_type <> 'UWI'          -- inspections don't reset fouling
WHERE v.ship_id = 'S1'
GROUP BY v.ship_id, v.noon_utc
ORDER BY v.noon_utc LIMIT 100
```
