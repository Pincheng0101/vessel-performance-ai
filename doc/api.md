# Async Query API — Client Integration Guide

Reference for the async query API: submit a predefined `query_type`, poll for
completion, page the results inline as JSON. The front-end Dashboard calls this API
instead of talking to Athena directly.

**Source of truth:** `lambda_function/async_query_api/{router,handlers,queries,config}.py`
(behaviour), `deployment/athena_tool_stack.py` (infrastructure), and
`ym_datalake/schema.py` (the catalog — what every column *means*).

> The old `/v1` (synthetic catalog, keyed on `imo_number`) and `/v2` (`vt_fd` /
> `maintenance`) namespaces are **gone**, along with every table they named. There is one
> unversioned `/queries` namespace over the current 20-table catalog, keyed on `ship_id`.
> `doc/legacy/api.md` and `doc/api_v2.md` describe the removed APIs and are historical only.

---

## 1. Overview

### 1.1 Why async

An Athena query can take seconds to minutes, which may exceed API Gateway's hard **29 s**
integration timeout. So the API is **submit → poll → results**: `POST` returns a `query_id`
immediately; the client polls status until `SUCCEEDED`, then fetches results (paged inline
JSON — no presigned URLs). Each Lambda call is a single Athena/DynamoDB round-trip, never
an in-Lambda poll.

### 1.2 Coordinates

| Setting | Value |
|---|---|
| Base URL | `AsyncQueryApiUrl` stack output = `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/` |
| Stage | `prod` |
| Path prefix | *(none — routes are `/queries`)* |
| Region | `us-west-2` |
| Auth | `x-api-key` header (required on all three `/queries` routes) |

The base URL already ends in `/prod/`, so a full endpoint is
`https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/queries`. Resolve the live
values from the stack outputs:

```bash
AWS_PROFILE=ym-hackathon aws cloudformation describe-stacks \
  --stack-name YmHackathonAthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiUrl'].OutputValue" --output text

AWS_PROFILE=ym-hackathon aws apigateway get-api-key \
  --api-key "$(AWS_PROFILE=ym-hackathon aws cloudformation describe-stacks \
    --stack-name YmHackathonAthenaToolStack \
    --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiKeyId'].OutputValue" --output text)" \
  --include-value --query value --output text
```

### 1.3 Interactive docs

| Route | Auth | Serves |
|---|---|---|
| `GET /swagger` | public | Swagger UI — a `query_type` dropdown with the exact params schema per type |
| `GET /openapi.json` | public | The raw OpenAPI schema |

The request body is a **discriminated union on `query_type`**, generated from the query
registry itself, so Swagger always shows the live parameter set — it cannot drift.

---

## 2. Routes

| Method | Path | Success | Purpose |
|---|---|---|---|
| POST | `/queries` | **202** | Submit a query; returns `query_id` |
| GET | `/queries/{query_id}` | **200** | Poll execution status |
| GET | `/queries/{query_id}/results?page_token=` | **200** | Fetch one page of result rows |

**1. Submit** — `POST /queries` with `{query_type, params}` → **202**:

```bash
curl -s -X POST "$BASE/queries" \
  -H "x-api-key: $API_KEY" -H 'content-type: application/json' \
  -d '{"query_type":"fact_performance_daily","params":{"ship_id":"S1","start_day":0,"end_day":90}}'
# {"query_id":"q_8f3a1c...","status":"PENDING"}
```

**2. Poll status** — `GET /queries/{query_id}` until `SUCCEEDED` (or `FAILED`):

```bash
curl -s "$BASE/queries/q_8f3a1c..." -H "x-api-key: $API_KEY"
# {"query_id":"q_8f3a1c...","status":"SUCCEEDED","result_location":"s3://.../q.csv"}
```

`status` is one of `PENDING` / `RUNNING` / `SUCCEEDED` / `FAILED`. `result_location`
appears only once `SUCCEEDED`.

**3. Fetch results** — `GET /queries/{query_id}/results` (only after `SUCCEEDED`; a
**409** until then):

```bash
curl -s "$BASE/queries/q_8f3a1c.../results" -H "x-api-key: $API_KEY"
# {"query_id":"...","columns":["ship_id","noon_utc",...],"rows":[["S1","0",...]],"next_page_token":"eyJ..."}
```

Athena caps a page at **1000 rows**. If `next_page_token` is present there are more rows —
pass it back to get the next page:

```bash
curl -s "$BASE/queries/q_8f3a1c.../results?page_token=eyJ..." -H "x-api-key: $API_KEY"
```

Every cell is a **string** (Athena's wire format) or `null` for SQL NULL. `columns` comes
from Athena's `ResultSetMetadata`, so the client always gets a named schema.

---

## 3. Query types

**23 = the 20 catalog tables + 3 derived.** Each table's query type is named after the
table and returns `SELECT *` from it — the projection cannot drift from the catalog, and
every table is small (largest: `noon_report`, 21,282 rows). Column *meanings* live in
`ym_datalake/schema.py`.

### 3.1 Shared parameters

Every parameter is optional unless marked **required**. Omitting them all is a full table
scan (paged), which is how you fetch a roster.

| Param | Applies to | Notes |
|---|---|---|
| `ship_id` | any table with a `ship_id` column | `S1`–`S12` (training) or `S21`–`S23` (prediction) |
| `start_day` / `end_day` | any table with a day axis | Inclusive range on **that table's own day column** (see below) |

**The day axis is relative-day integers, not calendar dates.** `noon_utc` / `event_day` /
`inspection_day` / `day` / `depart_day` / `due_day` / `opened_day` are the one axis every
table shares (day 0 = that ship's earliest record). The synthesized calendar columns
(`report_date`, `event_date`, …) are still **returned** in the projection — they are just
not filterable. `start_day` / `end_day` are integers ≥ 0.

### 3.2 The 20 table types

| `query_type` | ship filter | day filter | extra params |
|---|---|---|---|
| `noon_report` | `ship_id` | `noon_utc` | |
| `vessel_master` | `ship_id` | — | |
| `maintenance_event` | `ship_id` | `event_day` | |
| `reference_curve` | `ship_id` | — | |
| `uwi` | `ship_id` | `inspection_day` | |
| `fuel_price` | — | `day` | |
| `fact_performance_daily` | `ship_id` | `noon_utc` | |
| `fact_performance_indicator` | `ship_id` | — | |
| `fact_uwi` | `ship_id` | `inspection_day` | |
| `fact_maintenance_event` | `ship_id` | `event_day` | |
| `dim_vessel` | `ship_id` | — | |
| `dim_reference_curve` | `ship_id` | — | |
| `dim_port` | — | — | |
| `agg_fleet_daily` | — | `noon_utc` | `fleet_id` — **defaults to `ALL`** (see below) |
| `fact_voyage` | `ship_id` | `depart_day` | |
| `fact_anomaly` | `ship_id` | `noon_utc` | `severity` (`low`/`medium`/`high`) |
| `fact_alert` | `ship_id` | `opened_day` | `fleet_id`, `severity`, `status` (`open`/`closed`) |
| `fact_recommendation` | `ship_id` | — | |
| `fact_maintenance_recommendation` | `ship_id` | `due_day` | |
| `fact_speed_profile` | `ship_id` | — | |

**`fleet_id` differs between the two tables that have it**, because the data does:

* `agg_fleet_daily` — the grain is `(fleet, day)` and **`ALL` is a real rollup row that
  coexists with `FL-W1` / `FL-W2`**. The param therefore defaults to `ALL` and is *always*
  bound, so a query can never double-count the rollup against its sub-fleets. Accepts
  `ALL` / `FL-W1` / `FL-W2`.
* `fact_alert` — has **no** rollup row, so `fleet_id` accepts `FL-W1` / `FL-W2` only
  (passing `ALL` is a 422, not a silent empty result). Omit it for all fleets.

### 3.3 The 3 derived types

SQL that is not a single filtered table scan:

| `query_type` | params | Returns |
|---|---|---|
| `fleet_positions` | *(none)* | The latest `fact_performance_daily` row per ship — one dot each for the fleet map. `ship_id`, `noon_utc`, `report_date`, `latitude`, `longitude`, `heading_deg`, `speed_loss_pct`, `cii_rating_aer`, `port_from`, `port_to`, `voyage`. |
| `ship_speed_power` | `ship_id` **required** | One ship's measured (ISO-corrected, `valid_flag`-gated) points `UNION ALL` its clean-hull reference curve, aligned to `series` (`measured`/`reference`), `speed_kn`, `power_kw`, `days_since_cleaning`. |
| `predict_targets` | `ship_id` *(optional)* | The hackathon **PREDICT** cells — `noon_report WHERE predict_fuel_type IS NOT NULL`. These exist only in raw, and only for the prediction ships `S21`–`S23`. |

---

## 4. Errors

| Code | When | Body |
|---|---|---|
| **202** | Query accepted | `{query_id, status:"PENDING"}` |
| **403** | Missing/bad `x-api-key` | API Gateway rejects before the Lambda |
| **404** | Unknown `query_id` | `Unknown query_id: q_…` |
| **409** | `/results` before the query has `SUCCEEDED` | `Query q_… is not ready (status=RUNNING); poll GET /queries/q_… until SUCCEEDED` |
| **422** | Unknown `query_type`, bad param value, or an unexpected param | Pydantic validation detail |

**Invalid input is a 422, not a 400.** `query_type` is the discriminator of a typed union
and each variant's params model forbids extra fields and pattern-validates its values, so a
malformed body is rejected at the schema layer *before* dispatch. (`queries.render` still
raises its own 400 for an unknown type / bad params, but that path is only reachable by a
direct caller — it is defense-in-depth, not the wire contract.)

---

## 5. Safety

User values **never** reach the SQL text. Every parameter is bound as an Athena `?`
execution parameter, and each is pattern-validated by pydantic first (`ship_id` must match
`^S([1-9]|1[0-2]|2[1-3])$`, days are non-negative ints, and so on). The table and column
names are not user input at all — they come from the fixed `_TABLES` spec, which the unit
tests check against `ym_datalake.schema.ALL_TABLES` on every run.

Athena renders each execution parameter as a **quoted string literal**, so integer columns
are compared via an explicit `CAST(? AS integer)` — this is why the day filters bind
`'0'` / `'90'` rather than `0` / `90`.
