# Async Query API v2 — Real Dataset (`/v2/queries`)

The v2 catalog serves the **real hackathon dataset** (`vt_fd` + `maintenance`
Glue tables, loaded from `data/*.csv` via `python -m ym_datalake.etl
load-real --upload`). Base URL, authentication (`x-api-key`), throttling,
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

## 3. `query_type` catalog (6 types)

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

## 4. v1 ↔ v2 mapping

| v1 (synthetic, currently `FAILED`) | v2 (real) | Difference |
|---|---|---|
| `fleet_overview` | `fleet_overview` | raw per-day aggregate instead of curated KPIs; day params |
| `fleet_vessels` + `fleet_list` | `fleet_vessels` | coverage stats instead of vessel particulars (no vessel master exists) |
| `vessel_speed_loss` + `vessel_metrics` | `vessel_metrics` | raw signals instead of derived metrics (no curated ETL yet) |
| `vessel_speed_power` | `vessel_speed_power` | measured points only (no reference curve) |
| `vessel_maintenance_effect` + `vessel_uwi` | `vessel_maintenance_effect` | merged events + findings; no cost/recovery |
| — | `predict_targets` | new: the hackathon prediction targets |

No v2 counterpart for: alerts/anomalies (M3 statistics), recommendations,
track/positions (no lat/lon), voyages (no ports/dates), speed profile (needs
reference curve + charter rates) — all depend on derived layers that do not
exist for the real dataset yet.
