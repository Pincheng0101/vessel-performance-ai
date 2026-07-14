# ym-datalake-poc

陽明海運 (Yang Ming) AI 船舶效能分析 (vessel-performance analytics) POC — the data
lake and query stack behind the spec in [`doc/poc-spec.md`](doc/poc-spec.md).

Everything runs **locally** to produce the dataset (numpy / scikit-learn, no AWS),
then a single CDK stack lands it in S3 and exposes it through Athena, an async REST
API, and a no-build web Dashboard.

## Pipeline

```
 M1 generate          M2+M3 compute         M4 catalog + M5 API           M6 dashboard
 numpy · local        sklearn · local       Glue · Athena · Lambda        Vue+D3 · localhost
 ────────────         ─────────────         ─────────────────────         ─────────────────
 raw/*.jsonl   ──▶    curated/*.jsonl  ──▶   S3 data lake ─▶ Athena ─▶ async REST API ─▶ browser
      └──────── upload ────────┴──────────▶  s3://<bucket>/{raw,curated}/   (submit→poll→page)
```

| Milestone | What it delivers | Where |
|---|---|---|
| **M1** | Synthetic raw zone (6 tables) + per-day ground truth | `ym_datalake/synthetic_data/` |
| **M2** | Curated tables — ISO 15016/19030 corrections + derived indicators | `ym_datalake/etl/` |
| **M3** | Statistical insights — anomaly detection, cause classification, maintenance recommendation | `ym_datalake/etl/` |
| **M4** | Glue catalog + Athena WorkGroup (partition projection, no crawler) | `deployment/athena_tool_stack.py` |
| **M5** | Async query API — API Gateway + Lambda + DynamoDB registry | `lambda_function/async_query_api/` |
| **M6** | Dashboard — Fleet Overview, Fleet Map, Vessel Deep-dive, Optimizer, Planner, Alerts | `web/` |
| **M7** | ML forecasting — speed-loss / FOC point forecasts, health score, ML maintenance plan | `ym_datalake/ml/` |

Region is **`us-west-2`**; the CDK stack is **`AthenaToolStack`**.

## Contents

- [Prerequisites](#prerequisites)
- [Quick start (end-to-end)](#quick-start-end-to-end)
- [Repository layout](#repository-layout)
- [Configuration](#configuration)
- [Develop & test](#develop--test)
- [1. Deploy (CDK)](#1-deploy-cdk)
- [2. Generate synthetic data (M1)](#2-generate-synthetic-data-m1)
- [3. Compute curated tables (M2 + M3)](#3-compute-curated-tables-m2--m3)
- [4. Query / verify Athena](#4-query--verify-athena)
- [5. Async query API (M5)](#5-async-query-api-m5)
- [6. Dashboard (M6)](#6-dashboard-m6)
- [7. ML forecasts (M7)](#7-ml-forecasts-m7)
- [Documentation](#documentation)

## Prerequisites

| Tool | Used for | Notes |
|---|---|---|
| Python 3.13 + [`uv`](https://docs.astral.sh/uv/) | generate / ETL / tests / CDK app | `>=3.13,<3.14` |
| Node.js + `npx` | CDK CLI | `npx aws-cdk@latest` pins CLI ≥ 2.1129.0 (cloud-assembly schema ≥ 54) |
| Docker | Lambda bundling at `cdk deploy` | must be running |
| AWS credentials | deploy + upload + query | examples use `AWS_PROFILE=rdc-sso`; account must be CDK-bootstrapped |

Generating and computing the dataset need **none** of the AWS tooling — only
`uv`. AWS is required only to deploy, upload, and query.

## Quick start (end-to-end)

The happy path, in order. Uploading needs the deployed bucket, so **deploy first**;
each step links to its detailed section below.

```bash
uv sync                                                        # install deps

# 1. Deploy — note the CfnOutputs (bucket name, API url/key ids)
bash scripts/export-requirements.sh
AWS_PROFILE=rdc-sso npx aws-cdk@latest deploy -c env=dev
BUCKET=$(AWS_PROFILE=rdc-sso aws cloudformation describe-stacks --stack-name AthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='DataLakeBucketName'].OutputValue" --output text)

# 2. Generate raw data (M1) + upload raw/ → s3://$BUCKET/raw/
AWS_PROFILE=rdc-sso uv run python -m ym_datalake.synthetic_data generate \
  --out ./tmp --seed 42 --validate --upload --bucket "$BUCKET"

# 3. Compute curated tables (M2+M3) + upload curated/ → s3://$BUCKET/curated/
AWS_PROFILE=rdc-sso uv run python -m ym_datalake.etl compute \
  --in ./tmp --out ./tmp --validate --upload --bucket "$BUCKET"

# 4. Data is now queryable (partition projection — no crawler / MSCK). See §4–§5.

# 5. Dashboard
cp web/config.example.js web/config.js   # fill apiBaseUrl + apiKey (see §6)
python -m http.server 8000 -d web        # open http://localhost:8000
```

Drop `--upload --bucket` from steps 2–3 to build the dataset **fully offline** under
`./tmp/` without touching AWS.

## Repository layout

```
app.py                                  CDK entrypoint (requires -c env=<env>)
cdk.json                                "app": "uv run python app.py"
deployment/athena_tool_stack.py         data lake (bucket + glue tables) + athena workgroup + lambdas + API + SSM + IAM
conf/default.conf  conf/dev.conf        HOCON per-env config (include pattern)
ym_datalake/synthetic_data/             M1 generator (numpy, local-only)
  __main__.py                           CLI: generate / validate
  fleet.py curves.py physics.py ...     fleet specs, speed-power curves, forward physics model
  uploader.py                           put raw/ tree to S3 (I/O layer; test mock boundary)
ym_datalake/etl/                        M2/M3 ETL: raw zone → curated tables (numpy/scikit-learn, local-only)
  __main__.py                           CLI: compute / validate (C13 + C14)
  corrections.py filters.py indicators.py cii.py periods.py   M2: ISO 15016/19030 + derived indicators
  anomaly.py trends.py recommendation.py                      M3: anomaly detect + cause, fouling trend, cleaning rec.
  compute.py writer.py uploader.py      orchestrator (M2 + M3 _apply_m3), curated JSONL writer, put curated/ tree to S3
  validate.py                           C13 closed-loop + C14 statistical-insight checks
ym_datalake/ml/                         M7 ML pipeline: curated → forecasts (xgboost/sklearn, local-only)
  __main__.py                           CLI: train / backtest / infer / validate (C21–C23)
  dataset.py features.py               data I/O boundary + causal multi-horizon features
  models/ backtest.py registry.py      quantile-regressor race (xgboost/hgb/rf/linear/torch-mlp), IForest health, rolling-origin gate, model store
  forecast.py maintenance.py           batch pre-inference + predicted-curve cleaning optimiser
  writer.py uploader.py validate.py    ml/ JSONL writer, put ml/ tree to S3, C21–C23 checks
lambda_function/athena_query/           M4 sync query Lambda (router + pydantic handler + SSM/Athena I/O)
lambda_function/async_query_api/        M5 async REST API Lambda (aws-lambda-powertools resolver)
scripts/export-requirements.sh          pin lambda deps into requirements.txt
web/                                    M6 Dashboard — no-build Vue 3 + D3 static app
tests/unit/                             offline suite (boto3/numpy/sklearn mocked; no AWS/network)
tests/e2e/                              live suite against the deployed API (auto-skips offline)
```

`boto3` is provided by the Lambda runtime, so it is a dev-group dependency only
(not a runtime dep).

## Configuration

`conf/<env>.conf` (HOCON) drives the deploy. `conf/dev.conf` includes `default.conf`:

| Key | Meaning |
|---|---|
| `app.athena.database` | Glue database the stack creates and Athena queries (`ym_datalake_poc`). |
| `app.athena.catalog` | Data source catalog (default `AwsDataCatalog`). |
| `app.athena.workgroup_name` | Name of the WorkGroup this stack creates. |
| `app.athena.source_bucket_arns` | Extra S3 bucket ARNs Athena reads from. The data-lake bucket is granted automatically, so this stays `[]`. |

At deploy time the stack writes the non-secret Athena settings to SSM at
`/ym-datalake-poc/athena-config` as JSON `{"database","catalog","workgroup"}`; the
Lambda reads it at invoke time (cached 30 min).

## Develop & test

```bash
uv sync
ruff check --fix . && ruff format .
uv run pytest -s tests/unit/
```

`tests/unit/` is the offline suite (AWS mocked — no creds/network). Live tests that
call the deployed API live in `tests/e2e/` and auto-skip without AWS; see
[Async query API → End-to-end tests](#end-to-end-tests).

## 1. Deploy (CDK)

Requires AWS credentials, a bootstrapped account, and Docker (for Lambda bundling).
The CDK CLI must be recent enough for the `aws-cdk-lib` in `pyproject.toml`
(cloud-assembly schema ≥ 54, i.e. CLI ≥ 2.1129.0); `npx aws-cdk@latest` pins it.

```bash
bash scripts/export-requirements.sh                      # pin lambda runtime deps
AWS_PROFILE=rdc-sso npx aws-cdk@latest synth  -c env=dev  # inspect the template
AWS_PROFILE=rdc-sso npx aws-cdk@latest deploy -c env=dev  # note the CfnOutputs
```

The stack (`deployment/athena_tool_stack.py`) provisions:

- **Data lake** — a Glue database (`ym_datalake_poc`) over a raw + curated S3 bucket
  (20 tables total; see [`doc/table-schema.md`](doc/table-schema.md)). Raw zone: six
  JSON-SerDe tables (`noon_report` partitioned by `imo_number`+`year`; `vessel_master`
  (+`fleet_id`/`fleet_name`), `reference_curve`, `uwi`, `maintenance_event`,
  `fuel_price` unpartitioned). Curated zone (M2): `fact_performance_daily`
  (partitioned `imo_number`+`year`+`month`) and `fact_performance_indicator` /
  `fact_uwi` / `fact_maintenance_event` / `fact_voyage` (partitioned by
  `imo_number`) — these, like raw `noon_report`, use partition projection; plus flat
  `dim_vessel` (+`fleet_id`/`fleet_name`), `dim_reference_curve`, `dim_port`,
  `agg_fleet_daily` (grain = fleet × day — `ALL` rollup + 3 sub-fleets). Curated zone
  (M3): `fact_anomaly` (partitioned by `imo_number`, projection) plus flat
  `fact_recommendation`, `fact_maintenance_recommendation`, `fact_alert`. Curated
  zone (Phase 2, M2): `fact_speed_profile` (partitioned by `imo_number`, projection)
  — the bunker & slow-steaming optimizer, grain vessel × speed-grid point (columns
  in [`doc/skill/`](doc/skill/fact_speed_profile.md)).
- **Athena** — a WorkGroup, its results bucket, and a Lambda that runs SQL against
  Athena via boto3 (SSM runtime config + IAM).
- **Async query API (M5)** — a DynamoDB query registry (TTL), a second Lambda
  (`async_query_api`, aws-lambda-powertools REST resolver), and a REST API Gateway
  (`/v1/*`, `x-api-key` auth, CORS allow-all) implementing submit → poll → page.

**Outputs:** `DataLakeBucketName` (upload target), `AthenaQueryFunctionArn`
(sync invoke), `AthenaResultsBucketName`, and — for the async API (M5) —
`AsyncQueryApiUrl`, `AsyncQueryApiKeyId`, `QueryRegistryTableName`.

## 2. Generate synthetic data (M1)

Pure local Python — no AWS needed to produce or validate. Emits the raw-zone JSONL
tree under `./tmp/raw/` and per-day ground truth under `./tmp/truth/` (the latter is
never uploaded). See [`doc/synthetic-dataset.md`](doc/synthetic-dataset.md) (raw,
C1–C12) for the field-level design.

```bash
# generate 5 years × 9-vessel fleet, then run the C1–C12 consistency checks
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate

# re-run only the consistency checks against an existing tree
uv run python -m ym_datalake.synthetic_data validate --dir ./tmp
```

`generate` flags: `--out` (default `./tmp`), `--seed` (default `42`, deterministic),
`--start` / `--end` (default `2021-07-01`..`2026-06-30`), `--validate`, `--upload`,
`--bucket` (required with `--upload`), `--region` (default `us-west-2`).

Uploading requires the deployed data-lake bucket, so **deploy first** ([§1](#1-deploy-cdk)):

```bash
AWS_PROFILE=rdc-sso uv run python -m ym_datalake.synthetic_data generate \
  --out ./tmp --seed 42 --upload --bucket <DataLakeBucketName>
```

`--upload` puts every `./tmp/raw/**/*.jsonl` to `s3://<bucket>/raw/...` (skipping
`truth/`). The keys mirror the local layout, so the `noon_report` partition
directories land exactly on the prefixes the Glue table projects — no crawler /
`MSCK` needed.

## 3. Compute curated tables (M2 + M3)

A single `compute` pass reads the raw zone (never the ground truth) and writes the
curated JSONL tree under `./tmp/curated/` (see
[`doc/curated-dataset.md`](doc/curated-dataset.md) and
[`doc/insights.md`](doc/insights.md) for the field design):

- **M2** — applies ISO 15016/19030 + derived indicators to produce
  `fact_performance_daily` (and the dims / indicator / passthrough tables, plus the
  `fact_voyage` voyage roll-up + the `dim_port` port dimension + the Phase-2
  `fact_speed_profile` optimizer profile). It recovers the
  injected speed loss — the **C13** closed-loop check compares the recovered
  `speed_loss_pct` against the ground truth, **C18** asserts the voyage roll-up
  conserves fuel exactly (`Σ fact_voyage.total_foc_mt == Σ noon_report.total_foc_mt`
  per vessel), and **C19** asserts the optimizer's economical speed
  (`recommended_speed_kn`) equals the `usd_per_nm` argmin and is strictly interior to
  the speed grid — the usd/nm curve is convex (an interior minimum) thanks to the
  per-day charter time cost, a static per-vessel `charter_usd_per_day` particular on
  `VesselSpec` (`fleet.py`), deliberately NOT surfaced on `dim_vessel`.
- **M3** (`_apply_m3`) — the statistical layer runs over the M2 output: a piecewise
  Theil-Sen fouling-rate trend (`trends.py`), point-anomaly detection + rule-based
  cause/severity (`anomaly.py`, rolling-z / EWMA / IsolationForest), and per-vessel
  maintenance-effect + optimal-cleaning recommendation (`recommendation.py`). It
  emits `fact_anomaly` / `fact_recommendation` and fills the columns M2 left null
  (`anomaly_flag`/`anomaly_cause`/`anomaly_severity` on the daily table,
  `me_recovery_pct`/`payback_days` on `fact_maintenance_event`, `n_alerts` on
  `agg_fleet_daily`). The **C14** check scores recovered anomalies/causes/severities
  against the injected labels and sanity-checks the recommendations.

```bash
# compute curated tables (M2 + M3), then run C13 (closed-loop) + C14 (insight) + C18 (voyage balance) + C19 (economical speed)
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --validate

# re-run only C13 against an existing curated tree
uv run python -m ym_datalake.etl validate --dir ./tmp

# compute-and-upload to s3://<bucket>/curated/... (keys mirror the local layout)
AWS_PROFILE=rdc-sso uv run python -m ym_datalake.etl compute \
  --in ./tmp --out ./tmp --upload --bucket <DataLakeBucketName>
```

`compute` flags: `--in` (input dir holding `raw/`; `--validate` also reads `truth/`
here — default `./tmp`), `--out` (curated dir, default `./tmp`), `--validate` (runs
C13, C14, C18 **and** C19), `--upload`, `--bucket` (required with `--upload`), `--region`
(default `us-west-2`). The standalone `validate` subcommand re-runs **C13 only**
(C14 / C18 / C19 need the in-memory M2/M3 tables).

## 4. Query / verify Athena

Once data is uploaded, the tables are immediately queryable (partition projection
means no partition load step). Query via the Athena console, the `aws athena` CLI, or
the deployed sync Lambda:

```bash
aws lambda invoke --function-name <AthenaQueryFunctionArn> \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"run_query","sql":"SELECT count(*) AS n FROM noon_report WHERE imo_number='\''9700006'\'' AND year=2023"}' \
  out.json
# out.json → {"query_execution_id":"...","columns":["n"],"rows":[["365"]],"row_count":1}
```

Payload fields: `action` (`run_query`), `sql` (required), `max_rows` (default 1000),
optional `database` / `catalog` overrides. The curated (M2 + M3) tables query the
same way — only the `sql` changes:

```bash
# fact_performance_daily — daily rows for one vessel-month (projection prunes to one partition)
... "sql":"SELECT count(*) AS n FROM fact_performance_daily WHERE imo_number='\''9700006'\'' AND year=2023 AND month=6"

# dim_vessel — flat dimension
... "sql":"SELECT imo_number, vessel_name, dwt FROM dim_vessel LIMIT 3"

# agg_fleet_daily — fleet-wide daily rollup
... "sql":"SELECT report_date, n_vessels, avg_speed_loss_pct FROM agg_fleet_daily ORDER BY report_date DESC LIMIT 5"

# fact_anomaly (M3) — anomaly count by cause for one vessel (projection prunes to imo_number)
... "sql":"SELECT cause, count(*) AS n FROM fact_anomaly WHERE imo_number='\''9700006'\'' GROUP BY cause ORDER BY n DESC"

# fact_recommendation (M3) — recommended cleaning date + net saving per vessel
... "sql":"SELECT imo_number, recommended_clean_date, trigger_eta, net_saving_usd FROM fact_recommendation WHERE imo_number='\''9700006'\''"
```

Per-table column definitions live in [`doc/table-schema.md`](doc/table-schema.md).

## 5. Async query API (M5)

The Dashboard doesn't invoke the Lambda directly — Athena runs can exceed API
Gateway's 29s sync cap, so M5 exposes an **async** REST API: submit a query, poll its
status, then page the results inline. Clients never write SQL; they pick a
`query_type` from an allow-list of predefined, parameterized queries (all binds via
Athena `?` placeholders — no string interpolation), which the API validates
(pydantic) before starting the query. Full reference: [`doc/api.md`](doc/api.md).

| Method | Path | Returns |
|---|---|---|
| `POST` | `/v1/queries` | `202 {query_id, status:"PENDING"}` |
| `GET` | `/v1/queries/{query_id}` | `200 {query_id, status, result_location?}` — status is `PENDING`/`RUNNING`/`SUCCEEDED`/`FAILED` |
| `GET` | `/v1/queries/{query_id}/results?page_token=` | `200 {query_id, columns, rows, next_page_token?}` (`409` until `SUCCEEDED`) |

`query_type` → main table (poc-spec §8.6):

| `query_type` | params | main table(s) |
|---|---|---|
| `fleet_overview` | `fleet_id?`, `start_date?`, `end_date?` | `agg_fleet_daily` |
| `fleet_vessels` | — | `dim_vessel` |
| `fleet_list` | — | `dim_vessel` |
| `fleet_alerts` | `fleet_id?`, `severity?` | `fact_alert` |
| `vessel_speed_loss` | `imo_number`, `start_date?`, `end_date?` | `fact_performance_daily` |
| `vessel_metrics` | `imo_number`, `start_date?`, `end_date?` | `fact_performance_daily` |
| `vessel_speed_power` | `imo_number` | `fact_performance_daily` ∪ `dim_reference_curve` |
| `vessel_anomalies` | `imo_number` | `fact_anomaly` |
| `vessel_alerts` | `imo_number` | `fact_alert` |
| `vessel_maintenance_effect` | `imo_number` | `fact_maintenance_event` |
| `vessel_recommendation` | `imo_number` | `fact_recommendation` |
| `vessel_maintenance_recommendation` | `imo_number` | `fact_maintenance_recommendation` |
| `vessel_uwi` | `imo_number` | `fact_uwi` |
| `fleet_positions` | — | `fact_performance_daily` |
| `vessel_track` | `imo_number`, `start_date?`, `end_date?` | `fact_performance_daily` |
| `vessel_voyages` | `imo_number` | `fact_voyage` |
| `vessel_speed_profile` | `imo_number` | `fact_speed_profile` |

`fleet_id` (pattern `ALL|FL-[A-Z]{2,}`, default `ALL`) scopes `fleet_overview` and
`fleet_alerts` to one sub-fleet or the all-fleet rollup. `fleet_vessels` returns the
fleet roster + specs (deep-dive header); `fleet_list` feeds the fleet-picker dropdown
(distinct `fleet_id`/`fleet_name`); `vessel_metrics` returns the full daily metric set
(slip / SFOC / admiralty / CII / cumulative excess cost / data-quality flags)
powering the Dashboard deep-dive panels; `fleet_alerts` / `vessel_alerts` return open
`fact_alert` episodes (fleet-wide or per-vessel, newest first); `vessel_maintenance_recommendation`
returns the per-action planner strip (ordered by `plan_date`, then priority); `vessel_uwi`
returns underwater-inspection history. The three Phase-1 map/voyage types (§8.2):
`fleet_positions` returns the latest daily position per vessel (one dot each on the Fleet
Map), `vessel_track` returns a vessel's daily lat/lon polyline (deep-dive track map), and
`vessel_voyages` returns per-voyage economics from `fact_voyage` (sortable voyage table).
The Phase-2 optimizer type: `vessel_speed_profile` returns a vessel's convex
usd/nm-vs-speed curve from `fact_speed_profile` (24 speed-grid points with the
economical-speed marker) backing the Optimizer page.

`imo_number` is a 7-digit string; dates are `YYYY-MM-DD`. Auth is `x-api-key`
(throttled by a usage plan); the API stage is `prod`, so URLs are `…/prod/v1/…`.
The query registry (`query_id` → Athena execution id, type, status) lives in DynamoDB
with a 24h TTL that auto-cleans old records.

### Call flow

Deploy ([§1](#1-deploy-cdk)), upload M1/M2/M3 data, then grab the URL + key from the outputs:

```bash
URL=$(AWS_PROFILE=rdc-sso aws cloudformation describe-stacks --stack-name AthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiUrl'].OutputValue" --output text)
KEY_ID=$(AWS_PROFILE=rdc-sso aws cloudformation describe-stacks --stack-name AthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiKeyId'].OutputValue" --output text)
KEY=$(AWS_PROFILE=rdc-sso aws apigateway get-api-key --api-key "$KEY_ID" \
  --include-value --query value --output text)

# 1. submit → {query_id, status:"PENDING"}
QID=$(curl -s -XPOST "${URL}v1/queries" -H "x-api-key: $KEY" -H 'content-type: application/json' \
  -d '{"query_type":"vessel_recommendation","params":{"imo_number":"9700006"}}' | jq -r .query_id)

# 2. poll until SUCCEEDED
curl -s "${URL}v1/queries/$QID" -H "x-api-key: $KEY"          # {"query_id":...,"status":"RUNNING"}

# 3. page results inline (follow next_page_token if present)
curl -s "${URL}v1/queries/$QID/results" -H "x-api-key: $KEY"  # {"columns":[...],"rows":[[...]]}
```

The `async_query_api` Lambda is self-contained (its own `config.py` I/O boundary,
`pyproject.toml`, and Docker-bundled `requirements.txt`), mirroring `athena_query`.
Unit tests live under `tests/unit/lambda_function/async_query_api/`.

> **Athena string binds:** every `query_type` binds user values via Athena `?`
> execution parameters (never string-interpolated). Athena parses each parameter as a
> SQL literal, so string values must be single-quoted — `config._str_literal` wraps
> every bind as a quoted, quote-escaped literal (a bare `9700006` would otherwise read
> as an integer, `2024-01-01` as arithmetic, failing `TYPE_MISMATCH` against the
> varchar column).

### End-to-end tests

`tests/e2e/` exercises the **live** deployed API — submit → poll → page results —
across every `query_type`, plus pagination (`next_page_token`) and the 400 / 403 /
404 / 409 error paths. The suite resolves the API URL + key straight from the
`AthenaToolStack` CloudFormation outputs (via boto3 — no manual copying), so it needs
AWS credentials and a deployed stack **with M1/M2/M3 data uploaded** (otherwise
queries succeed but return no rows). It is marked `e2e` and **auto-skips** when the
stack or credentials are unavailable, so a plain `pytest` stays green offline.

```bash
AWS_PROFILE=rdc-sso uv run pytest -s -m e2e tests/e2e/
```

Overridable via env: `E2E_STACK_NAME` (default `AthenaToolStack`) and the standard
AWS region vars (default `us-west-2`). The suite uses only the Python stdlib HTTP
client (`urllib`) plus boto3 (already a dev dep) for output discovery.

## 6. Dashboard (M6)

`web/` is the Dashboard frontend (poc-spec §8) — a **no-build** static app (Vue 3 +
D3 v7 via CDN/ESM import map; Tailwind prebuilt into `web/tailwind.css`) that the browser serves from localhost
and that calls the **deployed** async query API directly (CORS is allow-all; auth is
the `x-api-key`), consuming all 18 `query_type`s. A fleet picker (`ALL` + 3
sub-fleets) scopes the fleet-level views. It renders six views: **Fleet Overview**
(KPI cards, sortable fleet table, CII + speed-loss distributions), **Fleet Map** (a
self-contained D3 world map — Natural Earth land committed as `web/assets/world.geojson`,
**zero external map-tile requests** — with each vessel at its latest position from
`fleet_positions`, planned-route arcs bent through the shared Suez/Malacca waypoints,
ports drawn with EU ports distinct, vessels colored by speed-loss or CII via a toggle;
clicking a vessel opens its deep-dive), **Vessel Deep-dive** (speed-loss trend with
maintenance events / threshold / Theil-Sen extrapolation to the predicted trigger,
speed–power scatter, slip / SFOC / admiralty diagnostics, fuel & CII trends, an
**excess-cost attribution** chart (fouling / weather / operational, stacked to the total
fuel penalty), anomaly
timeline, maintenance-effect + recommendation + per-action planner strip
(`plan_date`/`plan_service_type` windows) + UWI + data-quality panels, plus a
**per-vessel voyage track map** and a **sortable voyage-economics table** (route, dates,
distance, sea days, avg speed, FOC, fuel cost, CO₂, speed loss, $/nm, on-time badge)),
**Optimizer** (the Bunker & Slow-Steaming Optimizer — a convex usd/nm-vs-speed curve
with current / economical / schedule-optimal markers, a distance/days slider that
recomputes live savings, and a fleet slow-steaming-savings KPI), **Planner** (the
Maintenance Budget & Dry-dock Planner — a per-vessel maintenance Gantt, capex
stacked by quarter, and an ROI-ranked backlog over the fleet-wide
`fleet_maintenance_recommendation` query, with indicative capex derived query-time
from historical event cost), and **Alerts**
(deduplicated, bilingual early-warning **episodes** from `fact_alert` — not a raw
anomaly list).

```bash
cp web/config.example.js web/config.js   # then fill apiBaseUrl + apiKey (git-ignored)

bin/dashboard-start.sh                    # serves ./web on http://localhost:8000 (backgrounded)
bin/dashboard-stop.sh                     # stops it
# open http://localhost:8000  (default vessel: YM WELLNESS / 9700006)
```

`dashboard-start.sh` backgrounds a static file server (ES modules need `http://`,
not `file://`), writing its pid + logs under `tmp/`; set `PORT` to override 8000.
Equivalent one-liner: `python -m http.server 8000 -d web`.

`web/tailwind.css` is the checked-in, prebuilt Tailwind v3 stylesheet (replaces the
Play CDN, which console-warns against production use). Regenerate it after adding or
removing Tailwind classes in `web/`:

```bash
npx -y tailwindcss@3 -i - -o web/tailwind.css --minify \
  --content './web/**/*.{html,js}' <<<'@tailwind base;@tailwind components;@tailwind utilities;'
```

`apiBaseUrl` is the `AsyncQueryApiUrl` output; `apiKey` is the API key value (see the
[call flow](#call-flow) for how to fetch both). The key ships to the browser (visible
in traffic) — acceptable for this POC only. The client submits a `query_type`, polls
status, then pages results (`api.js`), coercing the all-string Athena cells to
numbers/booleans.

**Not built (documented omissions):** **Reports** (§8.5 — GenAI, deferred by §5.7).
(The fleet **map** (§8.2) is now built — Phase 1 added the decorative positions,
`fact_voyage`/`dim_port`, and the `fleet_positions`/`vessel_track`/`vessel_voyages`
queries that back it.) (The bunker & slow-steaming **optimizer** is now built —
Phase 2 added the `fact_speed_profile` speed-cost profile, the `vessel_speed_profile`
query, the **Optimizer** page, and the **C19** economical-speed check.)

## 7. ML forecasts (M7)

`ym_datalake/ml/` trains locally on the curated zone (plus raw `noon_report`
for the FOC labels — never the ground truth) and **pre-computes** all inference
as JSONL: per-vessel 1–90-day p10/p50/p90 forecasts of speed loss and daily
FOC (`fact_ml_prediction`, imo-partitioned), an IsolationForest fleet-health
score, and a predicted-curve hull-cleaning plan (`fact_ml_maintenance_plan`)
with the M3 closed-form date as its comparison column. Models live in a local
registry (`./tmp/models/`, traced by `dim_ml_model`); nothing serves online.
Design + checks: [`doc/ml-pipeline-zh.md`](doc/ml-pipeline-zh.md).

macOS needs the OpenMP runtime once: `brew install libomp` (xgboost).

```bash
# train: rolling-origin backtest (C21 gate vs persistence/Theil-Sen) → fit → registry
uv run python -m ym_datalake.ml train --in ./tmp --models ./tmp/models --seed 42

# batch pre-inference → ./tmp/ml/*.jsonl, validate C21–C23, upload to s3://<bucket>/ml/
AWS_PROFILE=rdc-sso uv run python -m ym_datalake.ml infer \
  --in ./tmp --models ./tmp/models --out ./tmp --validate --upload --bucket "$BUCKET"
```

Glue tables / API `query_type`s / Dashboard overlays for the `ml/` zone are a
documented follow-up (`doc/ml-pipeline-zh.md` §7, §10).

## Documentation

| Doc | Contents |
|---|---|
| [`doc/poc-spec.md`](doc/poc-spec.md) | Full POC specification (all milestones). |
| [`doc/poc-requirements.md`](doc/poc-requirements.md) | Requirements summary. |
| [`doc/synthetic-dataset.md`](doc/synthetic-dataset.md) | M1 raw-zone field design + C1–C12 checks. |
| [`doc/curated-dataset.md`](doc/curated-dataset.md) | M2 curated field design + C13 closed loop. |
| [`doc/insights.md`](doc/insights.md) | M3 statistical-insight field design + C14 checks. |
| [`doc/table-schema.md`](doc/table-schema.md) | Per-table Athena/Glue column dictionary (20 tables). |
| [`doc/api.md`](doc/api.md) | Async query API (M5) reference. |
| [`doc/ml-pipeline-zh.md`](doc/ml-pipeline-zh.md) | M7 ML training & inference pipeline design + C21–C23 checks (Chinese). |
| [`doc/skill/`](doc/skill/README.md) | One self-contained skill file per table (text→SQL reference), mirroring `table-schema.md`. |
| [`doc/genbi-agent.md`](doc/genbi-agent.md) | GenBI agent (LangForge): what it is, how to create/update (`lfe_resource/` + `scripts/lfe_register.py`). |

Chinese (`-zh`) editions (dataset, insight, schema, API) accompany their English
twins section-for-section.
