# Async Query API v2 — Real Dataset (`/v2/queries`)

The v2 catalog serves the **real hackathon dataset**: the raw `vt_fd` +
`maintenance` Glue tables (loaded via `python -m ym_datalake.etl load-real
--upload`) plus the curated `fact_ship_*` tables (computed via `python -m
ym_datalake.etl compute-real --upload` — speed loss, anomalies, alerts,
recommendations). Base URL, authentication (`x-api-key`), throttling,
lifecycle (submit → poll → results), paging, and error shapes are **identical
to v1** — see `doc/api.md` §1–§3 and §5–§6; only the path prefix (`/v2`) and
the `query_type` catalog below differ.

**Source of truth:** `lambda_function/async_query_api/queries.py`
(`QUERY_TYPES_V2`). Table schemas: `table/real_data.py` and
`doc/table-schema.md` "Real-dataset tables".

> v2 reuses the v1 `query_type` **names** where a counterpart exists (the
> version path is the namespace), so Dashboard code keeps its query strings.
> The **params differ**: real data is keyed by `ship_id` and a per-ship
> relative-day axis, not `imo_number` and calendar dates.

---

## 1. Endpoints

| Method | Path | Success | Purpose |
|---|---|---|---|
| POST | `/v2/queries` | **202** | Submit a query; returns `query_id` |
| GET | `/v2/queries/{query_id}` | **200** | Poll execution status |
| GET | `/v2/queries/{query_id}/results?page_token=` | **200** | Fetch one page of result rows |

```bash
curl -s -X POST "$BASE/v2/queries" \
  -H "x-api-key: $API_KEY" -H "content-type: application/json" \
  -d '{"query_type":"vessel_metrics","params":{"ship_id":"S21","start_day":440,"end_day":460}}'
```

## 2. Parameter rules

Validated server-side; violations → **400**. `params` accepts **only** the
fields listed per type (`extra='forbid'`). A day range accepts `start_day`
alone, `end_day` alone, both (BETWEEN), or neither (full history).

| Param | Type | Constraint | Notes |
|---|---|---|---|
| `ship_id` | string | `^S([1-9]\|1[0-2]\|2[1-3])$` | `S1`–`S12` training ships, `S21`–`S23` prediction ships |
| `start_day` | integer | ≥ 0 | inclusive lower bound on relative day `noon_utc` |
| `end_day` | integer | ≥ 0 | inclusive upper bound on relative day `noon_utc` |

`noon_utc` is a **relative day**: day 0 = that ship's earliest record (data
spans days 0–1825, ~5 years). It is per-ship — day N on two ships is not the
same calendar date.

## 3. `query_type` catalog (12 types)

### Data provenance

Every v2 type serves **real data** — either raw measurements or values derived
from them. Nothing in v2 is synthetic.

#### Raw CSV (measurements, 1:1 from `data/*.csv`)

Served as loaded, no modeling; only `HIDDEN`/`PREDICT` → null + marker columns:

| query_type | Backing table | Source file |
|---|---|---|
| `fleet_overview` | `vt_fd` | vt_fd.csv (per-day aggregate) |
| `fleet_vessels` | `vt_fd` | vt_fd.csv (per-ship counts) |
| `vessel_metrics` | `vt_fd` | vt_fd.csv |
| `vessel_speed_power` | `vt_fd` | vt_fd.csv |
| `vessel_maintenance_effect` | `maintenance` | maintenance.csv |
| `predict_targets` | `vt_fd` | vt_fd.csv (PREDICT cells) |

#### Derived (computed from the raw measurements by `compute-real`)

Model estimates, not measurements: deterministic math over the real rows
(baseline power-curve fit, robust-z statistics, trigger/ETA heuristics), zero
randomness, zero invented data points. Thresholds are constants in
`ym_datalake/etl/real_compute.py`. Empty until `compute-real --upload` has run:

| query_type | Backing table | Derivation |
|---|---|---|
| `vessel_speed_loss` | `fact_ship_daily` | fitted clean-hull curve → expected speed → speed loss |
| `vessel_anomalies` | `fact_ship_anomaly` | robust z over the ship's own signal distribution |
| `vessel_alerts` / `fleet_alerts` | `fact_ship_alert` | anomaly runs grouped into episodes |
| `vessel_maintenance_recommendation` / `fleet_maintenance_recommendation` | `fact_ship_maintenance_recommendation` | trigger/ETA + drift heuristics |

#### Synthetic — NOT migrated to v2

The v1 catalog (18 types, `doc/api.md` §4)
was built on the generated synthetic lake (`ym_datalake/synthetic_data/`);
those Glue tables are unregistered, so v1 always fails. Six v1 concepts were
re-implemented above on real data under the same names. The rest have **no v2
counterpart** because the real dataset lacks their inputs:

| v1 query_type (synthetic only) | Missing real input |
|---|---|
| `vessel_track`, `fleet_positions` | no latitude/longitude |
| `vessel_voyages` | no ports, no calendar dates |
| `fleet_list` | no fleet grouping (only W1/W2 sister classes) |
| `vessel_uwi` | no UWI metrics (fouling rating/coverage, roughness µm, coating %) |
| `vessel_speed_profile` | no sea-trial reference curve, no charter rates |
| `vessel_recommendation` | no cleaning costs, no fuel prices |

### Catalog

### 3.1 `fleet_overview`

Cross-ship per-day aggregate. **Caveat:** `noon_utc` is per-ship relative, so
this is an approximate overview, not a calendar alignment. Backing: `vt_fd`.

- **Params:** `start_day?`, `end_day?`.
- **Returns:** `noon_utc`, `n_ships`, `avg_sog`, `avg_stw`, `total_consump_mt`,
  `avg_wind_scale`. Ordered by `noon_utc`.

### 3.2 `fleet_vessels`

Ship roster: per-ship coverage + placeholder counts. Backing: `vt_fd`.

- **Params:** none.
- **Returns:** `ship_id`, `n_rows`, `first_day`, `last_day`, `n_predict`
  (PREDICT cells — non-zero only on S21–S23), `n_masked`. Ordered by `ship_id`
  (15 rows).

### 3.3 `vessel_metrics`

One ship's full daily signal series — navigation, drafts/loading, weather,
engine, per-fuel consumption, hours, placeholder markers. Backing: `vt_fd`.

- **Params:** `ship_id` **(required)**, `start_day?`, `end_day?`.
- **Returns:** `noon_utc`, `voyage`, `avg_speed`, `speed_through_water`,
  `me_avg_rpm`, `propeller_speed`, `fore_draft`, `after_draft`, `mid_draft`,
  `displacement`, `cargo_on_board`, `wind_scale`, `wind_speed`, `sea_height`,
  `swell_height`, `sea_water_temp`, `water_depth`, `total_distance`,
  `sea_speed_distance`, `hours_full_speed`, `hours_total`, `horse_power`,
  `load_pct`, `sfoc`, `me_slip`, `total_consump`, `me_consumption`, the five
  `me_fullspeed_consump_*` columns, `masked_flag`, `predict_fuel_type`.
  Ordered by `noon_utc`. Cells masked in the source (`HIDDEN`/`PREDICT`) are
  null; `masked_flag=true` marks such rows.

### 3.4 `vessel_speed_power`

STW-vs-power scatter points for performance-curve fitting (rows with both
signals present). The client applies further steady-state gating (e.g.
`hours_full_speed >= 22`, `wind_scale <= 4`). No clean-hull reference curve
exists for the real data — fit a baseline from early-cycle points. Backing:
`vt_fd`.

- **Params:** `ship_id` **(required)**.
- **Returns:** `noon_utc`, `speed_through_water`, `horse_power`, `me_avg_rpm`,
  `displacement`, `wind_scale`, `hours_full_speed`. Ordered by `noon_utc`.

### 3.5 `vessel_maintenance_effect`

Maintenance / inspection events for one ship (events and inspection findings
are merged in the real data; there are no cost/recovery columns). Backing:
`maintenance`.

- **Params:** `ship_id` **(required)**.
- **Returns:** `event_day` (relative day, same axis as `noon_utc`),
  `event_type` (PP / UWI+PP / UWC / UWC+PP / DD / UWI), `propeller_condition`
  (Good/Fair/Poor), `hull_fouling_type` (comma list), `hull_coating_condition`,
  `cavitation_found` (Yes/No), `draft_fwd_m`, `draft_aft_m`. Ordered by
  `event_day`.

### 3.6 `predict_targets`

The PREDICT cells (102 total: 91 HSHFO + 11 VLSFO, all on S21–S23) + context
columns for the prediction workflow. Backing: `vt_fd`.

- **Params:** `ship_id?` (optional filter).
- **Returns:** `ship_id`, `noon_utc`, `predict_fuel_type` (the
  `ME_FULLSPEED_CONSUMP_*` column to predict, in submission form),
  `hours_full_speed`, `wind_scale`, `avg_speed`, `speed_through_water`,
  `me_avg_rpm`. Ordered by `ship_id`, `noon_utc`.

### 3.7 `vessel_speed_loss`

ISO 19030-style speed-loss trend for one ship: per ship a clean-hull power
curve `P = a·V^n` is fitted on baseline windows (first 60 days of data and
after each UWC/UWC+PP/DD event), inverted at the measured power to get the
expected speed. Backing: `fact_ship_daily`.

- **Params:** `ship_id` **(required)**, `start_day?`, `end_day?`.
- **Returns:** `noon_utc`, `speed_loss_pct` (`(v_expected − STW)/v_expected ×
  100`, + = degradation), `v_expected_kn`, `days_since_cleaning` (resets on
  UWC/UWC+PP/DD), `days_since_polish` (resets on PP/UWI+PP/UWC+PP/DD),
  `valid_flag` (steady-state gate: ≥20 h full speed, wind ≤4, STW in bounds,
  unmasked). Ordered by `noon_utc`.

### 3.8 `vessel_anomalies`

Anomaly timeline for one ship: robust z-score (median/MAD, floored scale) per
metric over the ship's own valid-day distribution; flagged at |z| ≥ 3.5.
Backing: `fact_ship_anomaly`.

- **Params:** `ship_id` **(required)**.
- **Returns:** `noon_utc`, `metric` (`speed_loss_pct` / `sfoc` / `me_slip` /
  `total_consump`), `value`, `z_score`, `severity` (low <4.5 ≤ medium <6 ≤
  high). Ordered by `noon_utc`.

### 3.9 `vessel_alerts`

Alert episodes for one ship: consecutive anomaly days per (ship, metric) with
gaps ≤14 days merge into one episode; an episode is `open` when last seen
within 30 days of the ship's final data day. Backing: `fact_ship_alert`.

- **Params:** `ship_id` **(required)**.
- **Returns:** `alert_id`, `metric`, `opened_day`, `last_seen_day`, `n_days`,
  `peak_value`, `peak_z`, `severity`, `status` (`open`/`closed`), `message`.
  Ordered by `last_seen_day` DESC.

### 3.10 `fleet_alerts`

Fleet-wide **open** alert episodes. Backing: `fact_ship_alert`.

- **Params:** `severity?` (`low`|`medium`|`high`).
- **Returns:** `ship_id` + the §3.9 columns. `WHERE status='open'`, optional
  severity filter. Ordered by `last_seen_day` DESC.

### 3.11 `vessel_maintenance_recommendation`

Maintenance actions for one ship (0–N rows; empty ⇒ up to date). Heuristics:
`hull_cleaning` — 14-day trailing speed loss vs the **8 %** trigger (crossed →
high; else linear-trend ETA ≤60 d → medium, ≤180 d → low); `propeller_polishing`
— trailing `me_slip` drifted ≥2 pp above the cycle median; `engine_inspection`
— trailing SFOC ≥105 % of the early-history baseline. Backing:
`fact_ship_maintenance_recommendation`.

- **Params:** `ship_id` **(required)**.
- **Returns:** `action_type`, `priority`, `due_day` (relative day),
  `current_value`, `threshold_value`, `rate_per_day`, `trigger_eta_day`,
  `rationale`. Ordered by priority rank (high→medium→low), then `action_type`.

### 3.12 `fleet_maintenance_recommendation`

Fleet-wide maintenance backlog — the §3.11 rows across all ships. Backing:
`fact_ship_maintenance_recommendation`.

- **Params:** none.
- **Returns:** `ship_id` + the §3.11 columns. Ordered by `due_day`, then
  priority rank, then `action_type`.

## 4. v1 ↔ v2 mapping

| v1 (synthetic, currently `FAILED`) | v2 (real) | Difference |
|---|---|---|
| `fleet_overview` | `fleet_overview` | raw per-day aggregate instead of curated KPIs; day params |
| `fleet_vessels` + `fleet_list` | `fleet_vessels` | coverage stats instead of vessel particulars (no vessel master exists) |
| `vessel_metrics` | `vessel_metrics` | raw signals instead of derived metrics |
| `vessel_speed_loss` | `vessel_speed_loss` | speed loss from a data-fitted baseline curve (no sea-trial reference); day axis |
| `vessel_speed_power` | `vessel_speed_power` | measured points only (no reference curve) |
| `vessel_maintenance_effect` + `vessel_uwi` | `vessel_maintenance_effect` | merged events + findings; no cost/recovery |
| `vessel_anomalies` | `vessel_anomalies` | robust-z over raw signals; no `cause` attribution |
| `fleet_alerts` / `vessel_alerts` | `fleet_alerts` / `vessel_alerts` | metric-based episodes; no cost/recommended-action/i18n messages |
| `vessel_maintenance_recommendation` | `vessel_maintenance_recommendation` | trigger/ETA heuristics; no planner windows / net-saving economics |
| `fleet_maintenance_recommendation` | `fleet_maintenance_recommendation` | same; no `est_cost_usd` (no event costs in real data) |
| — | `predict_targets` | new: the hackathon prediction targets |

No v2 counterpart for: `vessel_track` / `fleet_positions` (no lat/lon),
`vessel_voyages` (no ports/dates), `vessel_speed_profile` (needs reference
curve + charter rates), `vessel_recommendation` (needs cleaning cost + fuel
price) — blocked by data the real dataset does not provide.
