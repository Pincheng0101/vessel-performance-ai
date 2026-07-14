# Async Query API — Client Integration Guide

Reference for the M5 async query API (poc-spec §7): submit a predefined
`query_type`, poll for completion, page the results inline as JSON. The
front-end Dashboard calls this API instead of talking to Athena directly.

**Source of truth:** `lambda_function/async_query_api/{router,handlers,queries,config}.py`
(behaviour) and `deployment/athena_tool_stack.py` §7 (infrastructure). Column
*meanings* for every returned field live in `doc/table-schema.md`. The
Dashboard ↔ `query_type` ↔ table map is poc-spec §8.6.

> Chinese version: `doc/api-zh.md`.

---

## 1. Overview

### 1.1 Why async

An Athena query takes seconds to minutes, which can exceed API Gateway's hard
**29 s** integration timeout (poc-spec §7.1). So the API is **submit → poll →
results**: `POST` returns a `query_id` immediately; the client polls status
until `SUCCEEDED`, then fetches results (paged inline JSON — no presigned URLs).
Each Lambda call is a single Athena/DynamoDB round-trip, never an in-Lambda poll.

### 1.2 Coordinates

| Setting | Value |
|---|---|
| Base URL | `AsyncQueryApiUrl` stack output = `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/` |
| Stage | `prod` |
| Path prefix | `/v1` |
| Region | `us-west-2` |

The base URL already ends in `/prod/`, so a full endpoint is
`https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/v1/queries`. Resolve
the live values from the stack outputs:

```bash
AWS_PROFILE=ym-hackathon aws cloudformation describe-stacks \
  --stack-name YmHackathonAthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiUrl' || OutputKey=='AsyncQueryApiKeyId']"
```

### 1.3 Authentication

Every route requires the `x-api-key` header. The key **id** is the
`AsyncQueryApiKeyId` output; fetch its secret **value** with:

```bash
AWS_PROFILE=ym-hackathon aws apigateway get-api-key \
  --api-key <AsyncQueryApiKeyId> --include-value --query value --output text
```

- Missing / wrong key → **403** `{"message":"Forbidden"}` (rejected by API
  Gateway before the Lambda runs).
- Usage plan throttles at **20 req/s, burst 40**; exceeding it → **429**
  `{"message":"Too Many Requests"}`.
- **CORS** is allow-all (`allow_origin='*'`), with `x-api-key` and
  `content-type` request headers permitted; the browser preflight (`OPTIONS`)
  is answered by an API Gateway MOCK integration.

---

## 2. Endpoints

| Method | Path | Success | Purpose |
|---|---|---|---|
| POST | `/v1/queries` | **202** | Submit a query; returns `query_id` |
| GET | `/v1/queries/{query_id}` | **200** | Poll execution status |
| GET | `/v1/queries/{query_id}/results?page_token=` | **200** | Fetch one page of result rows |

---

## 3. Lifecycle / flow

Submit → poll status until `SUCCEEDED` → fetch results (following
`next_page_token` while present). Set the coordinates once:

```bash
BASE="https://<api-id>.execute-api.us-west-2.amazonaws.com/prod"
API_KEY="<value from aws apigateway get-api-key ...>"
```

**1. Submit** — `POST /v1/queries` with `{query_type, params}` → **202**:

```bash
curl -s -X POST "$BASE/v1/queries" \
  -H "x-api-key: $API_KEY" -H "content-type: application/json" \
  -d '{"query_type":"vessel_speed_loss","params":{"imo_number":"9700006","start_date":"2024-01-01","end_date":"2024-01-07"}}'
# → {"query_id":"q_8f3a1c...","status":"PENDING"}
```

**2. Poll status** — `GET /v1/queries/{query_id}` until `SUCCEEDED` (or
`FAILED`); poll every ~2 s:

```bash
curl -s "$BASE/v1/queries/q_8f3a1c..." -H "x-api-key: $API_KEY"
# → {"query_id":"q_8f3a1c...","status":"RUNNING"}
# → {"query_id":"q_8f3a1c...","status":"SUCCEEDED","result_location":"s3://<AthenaResultsBucket>/results/q_....csv"}
```

**3. Fetch results** — `GET /v1/queries/{query_id}/results` (only after
`SUCCEEDED`; before that → **409**):

```bash
curl -s "$BASE/v1/queries/q_8f3a1c.../results" -H "x-api-key: $API_KEY"
# → {"query_id":"q_8f3a1c...",
#     "columns":["report_date","speed_loss_pct","v_expected_kn","days_since_cleaning","valid_flag"],
#     "rows":[["2024-01-01","3.82","21.55","294","true"], ...],
#     "next_page_token":"eyJvZmZzZXQiOjEwMDB9"}
```

**4. Next page** — pass the token back via `?page_token=` (URL-encoded); repeat
until the response has no `next_page_token`:

```bash
curl -s "$BASE/v1/queries/q_8f3a1c.../results?page_token=eyJvZmZzZXQiOjEwMDB9" \
  -H "x-api-key: $API_KEY"
```

---

## 4. `query_type` catalog

Eighteen allow-listed query types (poc-spec §8.6; Phase 1 adds the three
map/voyage types §4.14–§4.16, Phase 2 the optimizer type §4.17, Phase 6 the fleet
maintenance-backlog type §4.18). Each has a
fixed parameter model and returns the
columns below (all cells are strings — see §5.3). Column *meanings* are in the
linked `doc/table-schema.md` sections.

**Parameter rules** (validated server-side; violations → **400**):

| Param | Type | Pattern | Notes |
|---|---|---|---|
| `imo_number` | string | `^\d{7}$` | 7-digit IMO, e.g. `9700006` = YM WELLNESS |
| `start_date` | string | `^\d{4}-\d{2}-\d{2}$` | optional; inclusive lower bound on `report_date` |
| `end_date` | string | `^\d{4}-\d{2}-\d{2}$` | optional; inclusive upper bound on `report_date` |
| `fleet_id` | string | `^(ALL\|FL-[A-Z]{2,})$` | optional, default `ALL`; the all-fleet rollup or one `FL-XX` sub-fleet |
| `severity` | string | `^(low\|medium\|high)$` | optional; alert severity filter |

`params` accepts **only** the fields listed per type — any unknown key is
rejected (`extra='forbid'`). A date range accepts `start_date` alone, `end_date`
alone, both (BETWEEN), or neither (full history).

### 4.1 `fleet_overview`

Fleet-wide daily KPI series for the Fleet Overview page. Backing table:
`agg_fleet_daily` (table-schema §3.7).

- **Params:** `fleet_id?` (default `ALL`), `start_date?`, `end_date?`.
- **Returns:** `report_date`, `n_vessels`, `avg_speed_loss_pct`,
  `total_excess_cost_usd`, `cii_count_a`, `cii_count_b`, `cii_count_c`,
  `cii_count_d`, `cii_count_e`, `n_alerts`. Filtered to one `fleet_id` grain
  (the `ALL` rollup or a `FL-XX` sub-fleet); ordered by `report_date`.

### 4.2 `fleet_vessels`

Fleet roster + deep-dive header specs (one row per vessel). Backing table:
`dim_vessel` (table-schema §3.5).

- **Params:** none.
- **Returns:** `imo_number`, `vessel_name`, `vessel_type`, `build_year`,
  `lpp_m`, `breadth_m`, `dwt`, `mcr_kw`, `design_speed_kn`,
  `last_dry_dock_date`, `fleet_id`, `fleet_name`. Ordered by `imo_number`.

### 4.3 `fleet_list`

Distinct fleet id/name pairs for the fleet-picker dropdown. Backing table:
`dim_vessel` (table-schema §3.5).

- **Params:** none.
- **Returns:** `fleet_id`, `fleet_name` (`DISTINCT`). Ordered by `fleet_id`.

### 4.4 `fleet_alerts`

Fleet-wide open alert episodes for the Alerts view. Backing table:
`fact_alert` (table-schema §4.4).

**Alert columns** (`_ALERT_COLUMNS`, shared with `vessel_alerts` §4.9, 15
cols): `alert_id`, `fleet_id`, `opened_date`, `last_seen_date`, `cause`,
`severity`, `driver_metric`, `peak_value`, `peak_z`, `excess_cost_usd`,
`recommended_action`, `status`, `source`, `message_zh`, `message_en`.

- **Params:** `fleet_id?` (default `ALL`), `severity?` (`low`|`medium`|`high`).
- **Returns:** `imo_number` + the 15 alert columns above. `WHERE status =
  'open'`, optionally narrowed to one `fleet_id` (skipped when `ALL`) and/or
  `severity`. Ordered by `last_seen_date` DESC.

### 4.5 `vessel_speed_loss`

Speed-loss trend for one vessel (Deep-dive main chart). Backing table:
`fact_performance_daily` (table-schema §3.1).

- **Params:** `imo_number` **(required)**, `start_date?`, `end_date?`.
- **Returns:** `report_date`, `speed_loss_pct`, `v_expected_kn`,
  `days_since_cleaning`, `valid_flag`. Ordered by `report_date`.

### 4.6 `vessel_metrics`

Full daily metric set powering the Deep-dive Slip / SFOC / Admiralty / fuel /
CII panels. Backing table: `fact_performance_daily` (table-schema §3.1).

- **Params:** `imo_number` **(required)**, `start_date?`, `end_date?`.
- **Returns:** `report_date`, `speed_loss_pct`, `v_expected_kn`, `slip_real`,
  `slip_apparent`, `sfoc_g_kwh`, `admiralty_coef`, `eeoi`, `cii_aer`,
  `cii_rating_aer`, `cii_imo`, `cii_rating_imo`, `excess_cost_usd`,
  `cum_excess_cost_usd`, `excess_cost_fouling_usd`, `excess_cost_weather_usd`,
  `excess_cost_operational_usd`, `power_corrected_kw`, `resistance_wind_kn`,
  `resistance_wave_kn`, `co2_mt`, `days_since_cleaning`,
  `days_since_dry_dock`, `days_since_in_water`, `anomaly_flag`,
  `valid_flag`. Ordered by `report_date`.

### 4.7 `vessel_speed_power`

Speed–power scatter: measured points **⋃** the clean-hull reference curve, in
one long-format result keyed by a `series` discriminator. Backing tables:
`fact_performance_daily` (measured, `valid_flag` only) **⋃** `dim_reference_curve`
(reference) (table-schema §3.1, §3.6).

- **Params:** `imo_number` **(required)**.
- **Returns:** `series` (`measured` | `reference`), `speed_kn`, `power_kw`,
  `days_since_cleaning` (null on `reference` rows).

### 4.8 `vessel_anomalies`

Anomaly timeline / alerts for one vessel. Backing table: `fact_anomaly`
(table-schema §4.1).

- **Params:** `imo_number` **(required)**.
- **Returns:** `report_date`, `metric`, `value`, `z_score`, `severity`,
  `cause`. Ordered by `report_date`.

### 4.9 `vessel_alerts`

Single-vessel open alert episodes for the Deep-dive Alerts panel. Backing
table: `fact_alert` (table-schema §4.4).

- **Params:** `imo_number` **(required)**.
- **Returns:** the 15 alert columns (§4.4). Ordered by `last_seen_date` DESC.

### 4.10 `vessel_maintenance_effect`

Per-event maintenance effect (recovery, payback). Backing table:
`fact_maintenance_event` (table-schema §3.4).

- **Params:** `imo_number` **(required)**.
- **Returns:** `event_date`, `event_type`, `cost_usd`, `downtime_hours`,
  `me_recovery_pct`, `payback_days`. Ordered by `event_date`.

### 4.11 `vessel_recommendation`

Hull-cleaning cost optimization + net saving (one row per vessel). Backing
table: `fact_recommendation` (table-schema §4.2).

- **Params:** `imo_number` **(required)**.
- **Returns:** `last_cleaning_date`, `recommended_clean_date`, `trigger_eta`,
  `t_star_days`, `fouling_rate_pct_per_day`, `net_saving_usd`, `status`.

### 4.12 `vessel_maintenance_recommendation`

Overall maintenance actions for one vessel (0–N rows; empty ⇒ up to date).
Backing table: `fact_maintenance_recommendation` (table-schema §4.3).

- **Params:** `imo_number` **(required)**.
- **Returns:** `action_type`, `priority`, `due_date`, `rationale`, `source`, the
  per-action analytics strip (`degradation_rate`, `degradation_unit`,
  `current_value`, `threshold_value`, `trigger_eta`, `t_star_days`,
  `net_saving_usd`), and the planner's window tags `plan_date` /
  `plan_service_type`. Ordered by service window (`plan_date`), then priority rank
  (high→medium→low), then `action_type` — so rows arrive **pre-grouped by
  window**. Every action carries a genuine predictive `due_date` — the forecast
  crossing date of that action's degradation threshold, bounded to the priority
  window (else a priority-horizon fallback: high +30d / medium +90d); never null.
  `source` is one of `uwi`, `anomaly`, `fouling_model`, `sfoc_trend` (engine
  SFOC-drift-driven), or `uwi+anomaly`. A **consolidated planner** batches the
  scattered per-action due dates into shared service windows: `plan_date` is the
  window's "next maintenance date" and `plan_service_type` is `dry_dock` (needs a
  haul-out) or `in_water`; the Dashboard groups rows client-side by `plan_date`
  (deep-dive) and shows the earliest window as each vessel's next maintenance
  (fleet table).

### 4.13 `vessel_uwi`

Underwater-inspection findings for one vessel (latest row = current condition).
Backing table: `fact_uwi` (table-schema §2.4 / skill `fact_uwi.md`).

- **Params:** `imo_number` **(required)**.
- **Returns:** `inspection_date`, `inspection_type`, `hull_fouling_rating`,
  `hull_fouling_coverage_pct`, `propeller_condition`, `propeller_roughness_um`,
  `coating_breakdown_pct`, `coating_condition`, `recommended_action`. Ordered by
  `inspection_date`. `propeller_roughness_um` and `coating_breakdown_pct` are now
  independent, resettable signals (each with its own reset clock), not derived
  from hull fouling.

### 4.14 `vessel_track`

Daily positions + speed-loss / CII for one vessel — powers the Deep-dive
**per-vessel track map** (a polyline of daily lat/lon). Backing table:
`fact_performance_daily` (table-schema §3.1).

- **Params:** `imo_number` **(required)**, `start_date?`, `end_date?`.
- **Returns:** `report_date`, `latitude`, `longitude`, `speed_loss_pct`,
  `cii_rating_aer`, `voyage_no`, `port_from`, `port_to`. Ordered by `report_date`.
  Positions are carried on every daily row (at-sea + in-port) so the track is
  continuous; they are decorative (never feed physics — table-schema §3.1.2).

### 4.15 `vessel_voyages`

Per-voyage economics for one vessel — powers the Deep-dive **sortable
voyage-economics table** (route, dates, distance, sea days, avg speed, FOC, fuel
cost, CO₂, speed loss, $/nm, on-time). Backing table: `fact_voyage`
(table-schema §3.8).

- **Params:** `imo_number` **(required)**.
- **Returns:** `voyage_no`, `vessel_name`, `from_port`, `to_port`, `depart_date`,
  `arrive_date`, `distance_nm`, `sea_days`, `avg_speed_kn`, `total_foc_mt`,
  `fuel_cost_usd`, `co2_mt`, `avg_speed_loss_pct`, `usd_per_nm`, `on_time_flag`,
  `planned_eta`. Ordered by `depart_date` (oldest first).

### 4.16 `fleet_positions`

Latest daily row per vessel — powers the **Fleet Map** (one dot per vessel).
Backing table: `fact_performance_daily` (table-schema §3.1).

- **Params:** none.
- **Returns:** `imo_number`, `vessel_name`, `report_date`, `latitude`,
  `longitude`, `speed_loss_pct`, `cii_rating_aer`, `voyage_phase`, `port_from`,
  `port_to`, `voyage_no`. Ordered by `imo_number` (~9 rows). The newest row per
  `imo_number` is picked with a `row_number() OVER (PARTITION BY imo_number ORDER
  BY report_date DESC)` window — `report_date` is a `YYYY-MM-DD` string so `DESC`
  is chronological.

### 4.17 `vessel_speed_profile`

Speed-grid bunker economics for one vessel — powers the Dashboard **Optimizer
page** (the convex $/nm-vs-speed curve with current / economical / schedule
markers, live savings, fleet slow-steaming KPI, plus the fuel-vs-total cost
decomposition). Each of the 24 rows is one speed-grid point; the vessel-level
current / economical speed and annual distance repeat on every row. Backing
table: `fact_speed_profile` (skill `fact_speed_profile.md`).

- **Params:** `imo_number` **(required)**.
- **Returns:** `speed_kn`, `shaft_power_kw`, `foc_mt_per_day`, `co2_mt_per_day`,
  `fuel_usd_per_day`, `charter_usd_per_day`, `usd_per_day`, `usd_per_nm`,
  `fuel_usd_per_nm`, `vessel_name`, `recommended_speed_kn`, `current_speed_kn`,
  `annual_distance_nm`. Ordered by `speed_kn`.

### 4.18 `fleet_maintenance_recommendation`

Fleet-wide maintenance backlog for the Dashboard **Planner page** — the
per-action rows of `vessel_maintenance_recommendation` (§4.12) across **all**
vessels, each tagged with an indicative capex. Backing table:
`fact_maintenance_recommendation` (table-schema §4.3) **LEFT JOIN** a per-event
median cost from `fact_maintenance_event` (table-schema §3.4).

- **Params:** none.
- **Returns:** `imo_number`, `action_type`, `priority`, `due_date`, `rationale`,
  `source`, the per-action analytics strip (`degradation_rate`,
  `degradation_unit`, `current_value`, `threshold_value`, `trigger_eta`,
  `t_star_days`, `net_saving_usd`), the planner window tags (`plan_date`,
  `plan_service_type`), and **`est_cost_usd`**. Ordered by service window
  (`plan_date`), then priority rank (high→medium→low), then `action_type` — so
  rows arrive **pre-grouped by window** (same order as §4.12), fleet-wide.
- **`est_cost_usd` is a query-time derived column**, *not* stored: the
  `approx_percentile(cost_usd, 0.5)` (median) of the matching
  `fact_maintenance_event.event_type`. `event_type` matches `action_type` 1:1
  **except** `engine_inspection`, which maps to the `engine_overhaul` event cost
  (there is no pure-inspection event) — an **indicative** capex that overstates a
  bare inspection; the Planner labels it as such. Actions with no matching event
  type yield a null `est_cost_usd`.

Vessel names are resolved client-side from the `fleet_vessels` roster (§4.2), so
this query returns only `imo_number` — no `dim_vessel` join.

---

## 5. Request / response reference

### 5.1 Submit body — `POST /v1/queries`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query_type` | string | yes | — | one of the eighteen §4 types |
| `params` | object | no | `{}` | per-type params (§4); unknown keys → 400 |

Unknown top-level keys are rejected (`extra='forbid'`). Response — **202**:

```json
{ "query_id": "q_8f3a1c...", "status": "PENDING" }
```

`query_id` is always `q_` + 32 hex chars.

### 5.2 Status response — `GET /v1/queries/{query_id}`

```json
{ "query_id": "q_8f3a1c...", "status": "SUCCEEDED",
  "result_location": "s3://<AthenaResultsBucket>/results/q_....csv" }
```

`result_location` (the raw Athena CSV in S3) is present **only** when
`SUCCEEDED`; it is informational — clients read rows via `/results`, not S3.
`status` is one of four API states mapped from the Athena execution state:

| Athena state | API `status` |
|---|---|
| `QUEUED` | `PENDING` |
| `RUNNING` | `RUNNING` |
| `SUCCEEDED` | `SUCCEEDED` |
| `FAILED` | `FAILED` |
| `CANCELLED` | `FAILED` |

Any unrecognized Athena state falls back to `PENDING`.

### 5.3 Results response — `GET /v1/queries/{query_id}/results`

```json
{ "query_id": "q_8f3a1c...",
  "columns": ["report_date","speed_loss_pct","v_expected_kn","days_since_cleaning","valid_flag"],
  "rows": [["2024-01-01","3.82","21.55","294","true"]],
  "next_page_token": "eyJvZmZzZXQiOjEwMDB9" }
```

- `columns` — ordered column names (match the §4 `Returns` list for the type).
- `rows` — list of rows; each row is a list aligned to `columns`. **Every cell
  is a string or `null`** — Athena returns all values as varchar, so numbers
  (`"3.82"`, `"294"`) and booleans (`"true"`) arrive as strings; the client
  casts as needed.
- `next_page_token` — present only when more pages remain. Pages are capped at
  **1000 rows** (the Athena `GetQueryResults` limit). Pass the token back via
  `?page_token=` (URL-encoded) to get the next page. The column-name header row
  Athena prepends is stripped from the **first** page automatically.

---

## 6. Errors

Errors from the Lambda use the Powertools JSON shape `{"statusCode", "message"}`;
the 403 comes from API Gateway and has only `{"message"}`.

| HTTP | When | `message` shape |
|---|---|---|
| **400** | malformed body (missing/extra field), unknown `query_type`, or invalid `params` (bad IMO/date pattern, unknown param) | `Invalid request body: …` / `Unknown query_type …` / `Invalid params for …: …` |
| **403** | missing or invalid `x-api-key` | `Forbidden` (API Gateway; no `statusCode`) |
| **404** | unknown / expired `query_id` | `Unknown query_id: q_…` |
| **409** | `/results` requested before the query has `SUCCEEDED` | `Query q_… is not ready (status=RUNNING); poll GET /v1/queries/q_… until SUCCEEDED` |
| **429** | usage-plan throttle exceeded | `Too Many Requests` (API Gateway) |

On **409** the client should keep polling status and retry `/results` once
`SUCCEEDED`. A `FAILED` status is terminal — resubmit rather than poll forever.

---

## 7. Backend / deployment appendix

Compact map of the infrastructure (`deployment/athena_tool_stack.py` §7); not
needed to call the API.

**Lambda** (`AsyncQueryApiFunction`): Python 3.13, ARM64, handler
`router.lambda_handler`, 512 MB, 30 s timeout. Env: `QUERY_TABLE` (registry
table name), `SSM_PREFIX` (`/ym-datalake-poc`), `POWERTOOLS_SERVICE_NAME`
(`async-query-api`). Built with the Powertools REST resolver; each request is a
single Athena/DynamoDB round-trip.

**DynamoDB registry** (`QueryRegistryTable`, pay-per-request): PK `query_id`;
item `{query_id, exec_id, query_type, status, ttl}`. `ttl` = now + 24 h auto-
cleans stale records. The stored `status` is only a cache — Athena's execution
state is authoritative, re-read on every status/results call.

**SSM** `/ym-datalake-poc/athena-config` — JSON `{database, workgroup, catalog}`
read at query-submit time. Athena workgroup `ym-datalake-poc` enforces the
result location to `s3://<AthenaResultsBucket>/results/` (7-day lifecycle).

**Security.** User values are never concatenated into SQL: each `?` placeholder
is bound positionally via Athena `ExecutionParameters` (rendered as quoted
string literals), and `query_type` is allow-listed — so neither SQL injection
nor arbitrary SQL is reachable. Pydantic validates every param first (clean
400s, defence-in-depth).

**Stack outputs used by clients:** `AsyncQueryApiUrl` (base URL),
`AsyncQueryApiKeyId` (API key id → resolve value via `aws apigateway
get-api-key`).
