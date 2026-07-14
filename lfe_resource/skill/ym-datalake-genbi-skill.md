# `ym_datalake_poc` — GenBI SQL Guide

Write Athena SQL against the YangMing vessel-performance data lake and run it with the
**`athena_query`** tool — pass one SELECT statement as `query`. The database
(`ym_datalake_poc`), workgroup, and catalog are pre-configured on the tool; reference
tables by bare name.

This lake also powers the **YM Fleet Performance Dashboard** (pages: Fleet Overview,
Fleet Map, Vessel Deep-dive, Optimizer, Alerts). Users often ask about numbers they see
there — the [Dashboard queries](#dashboard-queries) section gives the exact SQL behind
each panel, so your answers match the dashboard. Substitute the example vessel
`'9700006'` and date literals with the user's context.

## Hard rules

1. **Always prune partitions.** Partitioned tables scan everything without a predicate:
   - `noon_report` → `WHERE imo_number='9700006' AND year=2025`
   - `fact_performance_daily` → `WHERE imo_number='9700006' AND year=2025 [AND month=6]`
   - `fact_anomaly`, `fact_alert`, `fact_uwi`, `fact_maintenance_event`, `fact_voyage`,
     `fact_performance_indicator`, `fact_speed_profile` → `WHERE imo_number='…'`
2. **`agg_fleet_daily` — always filter `fleet_id`.** Grain is fleet × day and it holds the
   `ALL` rollup **plus** 3 sub-fleets; without `WHERE fleet_id='ALL'` (or one sub-fleet) every
   number double-counts.
3. `imo_number` is a **7-digit string** — quote it. It is the universal join key.
4. All date columns are stored as strings — `CAST(report_date AS date)` for
   ordering/arithmetic.
5. Maintenance trigger threshold = **8.0** (`speed_loss_pct`). `speed_loss_pct` **positive =
   degradation**; maintenance resets it downward.
6. Nulls: ISO/derived columns (`speed_loss_pct`, `sfoc_g_kwh`, `excess_*`, …) are null on
   in-port days and outliers — filter `valid_flag = true` for trend-quality points.
7. SELECT only, one statement per call, aggregate in SQL, add `LIMIT`.

## Fleet

9 container ships, data **2021-07-01 … 2026-06-30**. `9700006` = **YM WELLNESS** (demo vessel).

| IMO | Name | Fleet | | IMO | Name | Fleet |
|---|---|---|---|---|---|---|
| 9700001 | YM HARMONY | FL-IA | | 9700006 | **YM WELLNESS** | FL-AE |
| 9700002 | YM ENLIGHTEN | FL-IA | | 9700007 | YM WARRANTY | FL-AE |
| 9700003 | YM PLENTY | FL-IA | | 9700008 | YM TRIUMPH | FL-TP |
| 9700004 | YM PROSPER | FL-TP | | 9700009 | YM TITAN | FL-AE |
| 9700005 | YM EXCELLENCE | FL-TP | | | | |

Fleets: `FL-IA` Intra-Asia · `FL-TP` Trans-Pacific · `FL-AE` Asia-Europe · `ALL` = rollup
(only in `agg_fleet_daily`).

## Tables

**Raw zone** (as-reported):

| Table | Grain | Partitions | Use for |
|---|---|---|---|
| `noon_report` | vessel × day | imo_number, year | raw daily reports: speeds, FOC, weather, drafts, position |
| `vessel_master` | vessel | — | raw vessel specs (prefer `dim_vessel`) |
| `reference_curve` | vessel × speed pt | — | sea-trial speed-power baseline (prefer `dim_reference_curve`) |
| `uwi` | inspection | — | raw underwater inspections (prefer `fact_uwi`) |
| `maintenance_event` | event | — | raw events (prefer `fact_maintenance_event`) |
| `fuel_price` | day × fuel | — | `date, fuel_type, price_usd_per_mt` |

**Curated zone** (analysis-ready — prefer these):

| Table | Grain | Partitions | Use for |
|---|---|---|---|
| `fact_performance_daily` | vessel × day | imo_number, year, month | **main table** — see columns below |
| `dim_vessel` | vessel | — | specs, `vessel_name`↔`imo_number`, `fleet_id`/`fleet_name`, `dwt`, `design_speed_kn`, `last_dry_dock_date` |
| `dim_reference_curve` | vessel × speed pt | — | `speed_kn`, `shaft_power_kw` baseline for speed-power scatter |
| `agg_fleet_daily` | fleet × day | — (filter `fleet_id`!) | fleet KPI: `n_vessels`, `avg_speed_loss_pct`, `total_excess_cost_usd`, `cii_count_a..e`, `n_alerts` |
| `fact_anomaly` | flagged day | imo_number | `report_date`, `metric`, `value`, `z_score`, `cause`, `severity` |
| `fact_alert` | alert episode | imo_number | deduplicated open alerts: `cause`, `severity`, `opened_date`, `message_zh`/`message_en`, `recommended_action`, `excess_cost_usd` |
| `fact_maintenance_event` | event | imo_number | `event_date`, `event_type`, `cost_usd`, `me_recovery_pct` (speed-loss recovered), `payback_days` |
| `fact_maintenance_recommendation` | vessel × action | — | `action_type`, `priority`, `due_date`, `rationale`, `source`, `current_value`/`threshold_value`, `trigger_eta`, `net_saving_usd`, `plan_date`, `plan_service_type` |
| `fact_recommendation` | vessel | — | hull-cleaning optimum: `recommended_clean_date`, `trigger_eta`, `t_star_days`, `net_saving_usd`, `fouling_rate_pct_per_day`, `status` |
| `fact_uwi` | inspection | imo_number | `inspection_date`, `hull_fouling_rating` (0–100), `propeller_condition` (Rubert A–F), `coating_condition` |
| `fact_performance_indicator` | vessel × period | imo_number | ISO 19030 `indicator` ∈ ISP/DDP/MT/ME per period |
| `fact_voyage` | vessel × voyage | imo_number | voyage economics: route, distance, sea days, FOC, fuel cost, CO₂, usd/nm |
| `fact_speed_profile` | vessel × speed pt | imo_number | optimizer: `speed_kn` grid, `usd_per_nm`, `fuel_usd_per_day`; `recommended_speed_kn` / `current_speed_kn` broadcast on every row |
| `dim_port` | port | — | `locode`, `name`, `lat`, `lon`, `is_eu` |

`fact_performance_daily` key columns (vessel × day): `report_date`, `voyage_phase`
(`at_sea`/`in_port`), `speed_loss_pct`, `v_expected_kn`, `speed_corrected_kn`,
`power_corrected_kw`, `slip_apparent`/`slip_real`, `sfoc_g_kwh`, `admiralty_coef`,
`co2_mt`, `eeoi`, `cii_aer`/`cii_rating_aer`, `cii_imo`/`cii_rating_imo`,
`excess_foc_mt`, `excess_cost_usd`, `cum_excess_cost_usd`,
`excess_cost_fouling_usd`/`excess_cost_weather_usd`/`excess_cost_operational_usd`,
`days_since_cleaning`, `anomaly_flag`/`anomaly_cause`/`anomaly_severity`, `valid_flag`,
`latitude`/`longitude`, `port_from`/`port_to`, `voyage_no`.

## Sample questions → query mapping

Typical questions (both languages) and which dashboard query answers them:

| User asks | Use | Answer with |
|---|---|---|
| 「YM WELLNESS 最近一年的 speed loss 趨勢如何？」 "How is the speed-loss trend?" | Deep-dive speed-loss trend (+ maintenance-effect events for markers) | monthly averages, direction, distance to the 8% trigger |
| 「什麼時候該安排船體清洗？可以省多少？」 "When to clean the hull?" | Deep-dive hull-cleaning optimization (`fact_recommendation`) | `recommended_clean_date`, `trigger_eta`, `net_saving_usd` |
| 「全船隊現在的狀況？CII 分布？」 "Fleet health today?" | Fleet Overview KPI (`agg_fleet_daily`, latest rows) | n_vessels, avg speed loss, excess cost, CII A–E counts, open alerts |
| 「哪些船需要維修？優先順序？」 "Which vessels need maintenance?" | Maintenance Planner backlog | actions by priority/due_date, service windows, est. cost |
| 「Optimizer 建議的航速是多少？一年省多少？」 "What's the economical speed?" | Optimizer speed profile | `recommended_speed_kn` vs `current_speed_kn`, usd/nm difference × `annual_distance_nm` |
| 「現在有哪些開放中的預警？」 "Any open alerts?" | Alerts page query | episodes by cause/severity, `message_zh`, recommended action |
| 「這艘船的異常是什麼原因造成的？」 "What caused the anomalies?" | Deep-dive anomaly timeline (+ UWI panel as corroboration) | cause breakdown, severities, matching inspection findings |
| 「上次清洗/塢修的效果如何？」 "Did the last cleaning work?" | Maintenance-effect panel | `me_recovery_pct`, `payback_days` per event |
| 「某艘船最近的航次表現？」 "Recent voyage economics?" | Voyage-economics table | $/nm, fuel cost, on-time flag per voyage |

## Dashboard queries

The exact SQL behind each YM Fleet Performance Dashboard panel. Use these (or trim
their column lists) when a user asks about something they see on the dashboard —
same tables, same filters → same numbers. Example binds: vessel `'9700006'`
(YM WELLNESS), fleet `'ALL'`; add `AND report_date BETWEEN '2025-07-01' AND
'2026-06-30'` style clauses when the user gives a period (`report_date` is a
`YYYY-MM-DD` string, so lexicographic comparison is chronological).

### Fleet Overview page

```sql
-- KPI cards + fleet trend (per selected fleet; 'ALL' = whole-fleet rollup)
SELECT report_date, n_vessels, avg_speed_loss_pct, total_excess_cost_usd,
       cii_count_a, cii_count_b, cii_count_c, cii_count_d, cii_count_e, n_alerts
FROM agg_fleet_daily WHERE fleet_id = 'ALL' ORDER BY report_date

-- fleet table roster + specs (also the deep-dive header)
SELECT imo_number, vessel_name, vessel_type, build_year, lpp_m, breadth_m,
       dwt, mcr_kw, design_speed_kn, last_dry_dock_date, fleet_id, fleet_name
FROM dim_vessel ORDER BY imo_number

-- fleet-picker dropdown
SELECT DISTINCT fleet_id, fleet_name FROM dim_vessel ORDER BY fleet_id
```

### Fleet Map page

```sql
-- one dot per vessel: latest daily position, colored by speed loss / CII
SELECT imo_number, vessel_name, report_date, latitude, longitude, speed_loss_pct,
       cii_rating_aer, voyage_phase, port_from, port_to, voyage_no
FROM (SELECT imo_number, vessel_name, report_date, latitude, longitude, speed_loss_pct,
             cii_rating_aer, voyage_phase, port_from, port_to, voyage_no,
             row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC) AS rn
      FROM fact_performance_daily) WHERE rn = 1 ORDER BY imo_number
```

Ports drawn from `dim_port` (`locode`, `name`, `lat`, `lon`, `is_eu`).

### Vessel Deep-dive page (per vessel)

```sql
-- ★ speed-loss trend chart (threshold 8%, Theil-Sen extrapolation drawn client-side)
SELECT report_date, speed_loss_pct, v_expected_kn, days_since_cleaning, valid_flag
FROM fact_performance_daily WHERE imo_number = '9700006' ORDER BY report_date

-- slip / SFOC / admiralty / fuel & CII / excess-cost-attribution panels (full metric set)
SELECT report_date, speed_loss_pct, v_expected_kn, slip_real, slip_apparent,
       sfoc_g_kwh, admiralty_coef, eeoi, cii_aer, cii_rating_aer, cii_imo, cii_rating_imo,
       excess_cost_usd, cum_excess_cost_usd, excess_cost_fouling_usd, excess_cost_weather_usd,
       excess_cost_operational_usd, power_corrected_kw, resistance_wind_kn,
       resistance_wave_kn, co2_mt, days_since_cleaning, days_since_dry_dock, days_since_in_water,
       anomaly_flag, valid_flag
FROM fact_performance_daily WHERE imo_number = '9700006' ORDER BY report_date

-- speed–power scatter: measured points vs sea-trial reference curve
SELECT 'measured' AS series, speed_corrected_kn AS speed_kn,
       power_corrected_kw AS power_kw, days_since_cleaning
FROM fact_performance_daily WHERE imo_number = '9700006' AND valid_flag
UNION ALL
SELECT 'reference' AS series, speed_kn, shaft_power_kw AS power_kw,
       CAST(NULL AS integer) AS days_since_cleaning
FROM dim_reference_curve WHERE imo_number = '9700006'

-- anomaly timeline
SELECT report_date, metric, value, z_score, severity, cause
FROM fact_anomaly WHERE imo_number = '9700006' ORDER BY report_date

-- maintenance-effect panel (ME recovery + payback per event)
SELECT event_date, event_type, cost_usd, downtime_hours, me_recovery_pct, payback_days
FROM fact_maintenance_event WHERE imo_number = '9700006' ORDER BY event_date

-- hull-cleaning optimization sub-panel (recommended date / trigger ETA / t* / net saving)
SELECT last_cleaning_date, recommended_clean_date, trigger_eta, t_star_days,
       fouling_rate_pct_per_day, net_saving_usd, status
FROM fact_recommendation WHERE imo_number = '9700006'

-- maintenance recommendations + per-action planner strip (grouped by service window)
SELECT action_type, priority, due_date, rationale, source,
       degradation_rate, degradation_unit, current_value, threshold_value,
       trigger_eta, t_star_days, net_saving_usd, plan_date, plan_service_type
FROM fact_maintenance_recommendation WHERE imo_number = '9700006'
ORDER BY plan_date, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, action_type

-- latest-inspection panel (last row = current condition)
SELECT inspection_date, inspection_type, hull_fouling_rating, hull_fouling_coverage_pct,
       propeller_condition, propeller_roughness_um, coating_breakdown_pct, coating_condition,
       recommended_action
FROM fact_uwi WHERE imo_number = '9700006' ORDER BY inspection_date

-- vessel alert panel (open episodes, newest first)
SELECT alert_id, fleet_id, opened_date, last_seen_date, cause, severity, driver_metric,
       peak_value, peak_z, excess_cost_usd, recommended_action, status, source,
       message_zh, message_en
FROM fact_alert WHERE imo_number = '9700006' ORDER BY last_seen_date DESC

-- voyage track map (daily lat/lon polyline)
SELECT report_date, latitude, longitude, speed_loss_pct, cii_rating_aer,
       voyage_no, port_from, port_to
FROM fact_performance_daily WHERE imo_number = '9700006' ORDER BY report_date

-- sortable voyage-economics table
SELECT voyage_no, vessel_name, from_port, to_port, depart_date, arrive_date,
       distance_nm, sea_days, avg_speed_kn, total_foc_mt, fuel_cost_usd, co2_mt,
       avg_speed_loss_pct, usd_per_nm, on_time_flag, planned_eta
FROM fact_voyage WHERE imo_number = '9700006' ORDER BY depart_date
```

### Optimizer page (Bunker & Slow-Steaming)

```sql
-- convex usd/nm-vs-speed curve with current / economical markers
SELECT speed_kn, shaft_power_kw, foc_mt_per_day, co2_mt_per_day, fuel_usd_per_day,
       charter_usd_per_day, usd_per_day, usd_per_nm, fuel_usd_per_nm, vessel_name,
       recommended_speed_kn, current_speed_kn, annual_distance_nm
FROM fact_speed_profile WHERE imo_number = '9700006' ORDER BY speed_kn
```

### Alerts page

```sql
-- fleet-wide open alert episodes, newest first (optional AND fleet_id = 'FL-AE' /
-- AND severity = 'high' filters)
SELECT imo_number, alert_id, fleet_id, opened_date, last_seen_date, cause, severity,
       driver_metric, peak_value, peak_z, excess_cost_usd, recommended_action, status,
       source, message_zh, message_en
FROM fact_alert WHERE status = 'open' ORDER BY last_seen_date DESC
```

### Maintenance Planner (fleet backlog)

```sql
-- fleet-wide action backlog with indicative cost (median historical event cost;
-- engine_inspection priced as engine_overhaul)
SELECT r.imo_number, r.action_type, r.priority, r.due_date, r.rationale, r.source,
       r.degradation_rate, r.degradation_unit, r.current_value, r.threshold_value,
       r.trigger_eta, r.t_star_days, r.net_saving_usd, r.plan_date, r.plan_service_type,
       e.est_cost_usd
FROM fact_maintenance_recommendation r
LEFT JOIN (SELECT event_type, approx_percentile(cost_usd, 0.5) AS est_cost_usd
           FROM fact_maintenance_event GROUP BY event_type) e
  ON e.event_type = CASE r.action_type WHEN 'engine_inspection' THEN 'engine_overhaul'
     ELSE r.action_type END
ORDER BY r.plan_date, CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         r.action_type
```

## Ad-hoc patterns

```sql
-- monthly speed-loss / excess-cost summary (compact answer for trend questions)
SELECT SUBSTR(report_date, 1, 7) AS month,
       ROUND(AVG(speed_loss_pct), 2) AS avg_speed_loss_pct,
       ROUND(SUM(excess_cost_usd), 0) AS excess_cost_usd
FROM fact_performance_daily
WHERE imo_number = '9700006' AND year IN (2025, 2026) AND valid_flag = true
GROUP BY 1 ORDER BY 1

```sql
-- resolve a vessel name to IMO first
SELECT imo_number, vessel_name, fleet_id FROM dim_vessel WHERE vessel_name LIKE '%WELLNESS%'

-- anomaly cause breakdown for one vessel
SELECT cause, severity, COUNT(*) AS n FROM fact_anomaly
WHERE imo_number = '9700006' GROUP BY cause, severity ORDER BY n DESC

-- open alerts, fleet-wide, newest first (bilingual message available)
SELECT imo_number, cause, severity, opened_date, message_zh, recommended_action
FROM fact_alert ORDER BY CAST(opened_date AS date) DESC LIMIT 20

-- economical speed from the optimizer profile (recommended_speed_kn = usd/nm argmin)
SELECT speed_kn, usd_per_nm, recommended_speed_kn, current_speed_kn FROM fact_speed_profile
WHERE imo_number = '9700006' ORDER BY speed_kn
```
