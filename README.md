# ym-hackathon

陽明海運 (Yang Ming) AI 船舶效能分析 (vessel-performance analytics) — the data lake and
query stack over the **real hackathon dataset**: hull fouling and propeller roughness
against propulsion performance, under ISO 19030.

The ETL runs **locally** (stdlib only, no AWS) to turn the three source files in
`dataset/` into 20 flat tables; a single CDK stack then lands them in S3 and exposes them
through Athena, an async REST API, and a no-build web Dashboard.

**New here? Start with [`doc/dataset.md`](doc/dataset.md)** — what is actually in the data.

## Pipeline

```
 build (local, stdlib)                 catalog + API                  dashboard
 ─────────────────────                 ─────────────────────          ─────────────────
 dataset/{vt_fd,maintenance,vessel}    Glue · Athena · Lambda         Vue+D3 · localhost
        │
        └─▶ raw/*.jsonl + curated/*.jsonl ─▶ S3 ─▶ Athena ─▶ async REST API ─▶ browser
                     └──── upload ────────▶  s3://<bucket>/{raw,curated}/  (submit→poll→page)
```

| Component | What it delivers | Where |
|---|---|---|
| **ETL** | 3 source files → 20 flat tables (clean · ISO 15016/19030 · CII · anomalies · recommendations) | `ym_datalake/etl/` |
| **Catalog** | Glue database + Athena WorkGroup — 20 flat, **unpartitioned** tables, no crawler | `deployment/athena_tool_stack.py` |
| **Async API** | API Gateway + Lambda + DynamoDB registry (submit → poll → page) | `lambda_function/async_query_api/` |
| **Dashboard** | Fleet Overview, Fleet Map, Vessel Deep-dive, Optimizer, Planner, Alerts | `web/` |

Region is **`us-west-2`**; the CDK stack is **`YmHackathonAthenaToolStack`**.

## Contents

- [Prerequisites](#prerequisites)
- [Quick start (end-to-end)](#quick-start-end-to-end)
- [Real dataset pipeline (hackathon data)](#real-dataset-pipeline-hackathon-data)
- [Repository layout](#repository-layout)
- [Configuration](#configuration)
- [Develop & test](#develop--test)
- [1. Deploy (CDK)](#1-deploy-cdk)
- [2. Build the data lake](#2-build-the-data-lake)
- [3. Query / verify Athena](#3-query--verify-athena)
- [4. Async query API](#4-async-query-api)
- [5. Dashboard](#5-dashboard)
- [Documentation](#documentation)

## Prerequisites

| Tool | Used for | Notes |
|---|---|---|
| Python 3.13 + [`uv`](https://docs.astral.sh/uv/) | generate / ETL / tests / CDK app | `>=3.13,<3.14` |
| Node.js + `npx` | CDK CLI | `npx aws-cdk@latest` pins CLI ≥ 2.1129.0 (cloud-assembly schema ≥ 54) |
| Docker | Lambda bundling at `cdk deploy` | must be running |
| AWS credentials | deploy + upload + query | examples use `AWS_PROFILE=ym-hackathon`; account must be CDK-bootstrapped |

Building the data lake needs **none** of the AWS tooling — only `uv`. AWS is required
only to deploy, upload, and query.

## Quick start (end-to-end)

The happy path, in order. Uploading needs the deployed bucket, so **deploy first**;
each step links to its detailed section below.

```bash
uv sync                                                        # install deps

# 1. Deploy — note the CfnOutputs (bucket name, API url/key ids)
bash scripts/export-requirements.sh
AWS_PROFILE=ym-hackathon npx aws-cdk@latest deploy -c env=dev

# 2. Build all 20 tables from ./dataset and upload them to the lake bucket
AWS_PROFILE=ym-hackathon uv run python -m ym_datalake.etl build --upload

# 3. Data is now queryable — no crawler, no MSCK, no partitions. See §3–§4.

# 4. Dashboard
cp web/config.example.js web/config.js   # fill apiBaseUrl + apiKey (see §5)
python -m http.server 8000 -d web        # open http://localhost:8000
```

Drop `--upload` from step 2 to build the whole lake **fully offline** under `./tmp/`
without touching AWS.

## Real dataset pipeline (hackathon data)

The Glue catalog serves the **real hackathon dataset** — `dataset/vt_fd.csv`,
`dataset/maintenance.csv`, `dataset/vessel.jsonl` — as **20 flat, unpartitioned
tables**. One command builds all of them:

```bash
AWS_PROFILE=ym-hackathon uv run python -m ym_datalake.etl build --upload
```

There is one command because there is one pipeline: `reference_curve` cannot be
fitted without the cleaned, environment-corrected daily spine, so splitting
"load" from "compute" would only mean computing the same thing twice. See
`ym_datalake/etl/curated/compute.py` for the DAG.

Side effects: writes locally under `--out` (default `./tmp`) and, with
`--upload`, puts objects to the data-lake bucket. Re-running is safe — the same
S3 keys are overwritten. The bucket resolves from `app.datalake.bucket_name` in
`conf/<env>.conf` (`--env`, default `dev`); `--bucket` overrides it. Other flags:
`--data` (source directory, default `./dataset`), `--out`, `--seed`, `--region`.

**The catalog** (schemas: `ym_datalake/schema.py`). Every table is flat — 21,282 noon
rows / ~4 MB is far below the size where partition pruning pays for itself, so
`ship_id` is an ordinary body column and each table is one JSONL file. No
projection, no crawler, no `MSCK`, no partition predicates.

| Zone | Tables |
|---|---|
| **raw** (6) | `noon_report` · `vessel_master` · `maintenance_event` · `reference_curve` · `uwi` · `fuel_price` |
| **curated** (14) | `fact_performance_daily` · `fact_performance_indicator` · `fact_uwi` · `fact_maintenance_event` · `dim_vessel` · `dim_reference_curve` · `dim_port` · `agg_fleet_daily` · `fact_voyage` · `fact_anomaly` · `fact_alert` · `fact_recommendation` · `fact_maintenance_recommendation` · `fact_speed_profile` |

**Raw is verbatim; all derivation happens in curated.** `noon_report`,
`vessel_master` and `maintenance_event` are the three source files landed
unmutated — every row, every column. That includes the 344 duplicate
`(ship_id, noon_utc)` rows and the gross outliers (671,576 kW of shaft power
against a 47,700 kW MCR). Dedupe, outlier clipping and displacement backfill all
happen in `curated/clean.py` and nowhere else. The only additions to raw are the
two loader markers `masked_flag` / `predict_fuel_type`, which *preserve* the
information the `HIDDEN`/`PREDICT` → null conversion would otherwise destroy.
`maintenance_event` splits composite events on `+` into atoms (77 rows → 115),
which expands rather than loses: `source_event_type` keeps the original on every
atom, so grouping on `(ship_id, event_day)` reconstructs the 77 source rows
exactly. `tests/unit/ym_datalake/test_preservation.py` enforces all of this.

**Provenance is mandatory.** Every column in `ym_datalake/schema.py` is tagged
*measured* (read from the source), *class* (a W1/W2 design value), or
*estimated* (synthesized — **never quote as fact**). The estimated set is: the
calendar epoch (day 0 = 2021-07-01), all geography, all USD, the UWI numeric
signals, and event cost/downtime/location. Full column dictionary:
[`doc/schema.md`](doc/schema.md).

Analytics thresholds (the ISO 19030 gate, the 8 % cleaning trigger, the z-score
bands) are constants in the `ym_datalake/etl/curated/` modules that own them.

**One finding worth knowing before you read a speed-loss number.** The ISO 15016
wind/wave correction is **decorative on this dataset**: the pipeline tests
bow-relative / true-compass / no-correction empirically and *no correction wins*
(4.534 pp detrended scatter vs 5.009 / 5.068), so `power_corrected_kw ==
horse_power`. The Beaufort ≤ 4 gate is what excludes weather here, not a
correction term. The verdict is re-derived and printed on every build. See
[`doc/curated-dataset.md`](doc/curated-dataset.md#corrections).

## Repository layout

```
app.py                                  CDK entrypoint (requires -c env=<env>)
cdk.json                                "app": "uv run python app.py"
deployment/athena_tool_stack.py         data lake (bucket + glue tables) + athena workgroup + lambdas + API + SSM + IAM
conf/default.conf  conf/dev.conf        HOCON per-env config (include pattern)
ym_datalake/schema.py                   the catalog: all 20 tables, every column tagged measured / class / estimated
ym_datalake/etl/                        the pipeline: 3 source files → 20 flat JSONL tables (local-only)
  __main__.py                           CLI: build
  source.py                             load the 3 sources VERBATIM (+ the maintenance `+` split)
  epoch.py fuel.py ports.py physics.py  calendar, 5-fuel constants, 10 LOCODEs, ISO 15016/19030 physics
  raw/                                  reference_curve (fitted), uwi (inspection projection), fuel_price
  curated/clean.py                      dedupe + outlier clipping + displacement backfill — ALL mutation lives here
  curated/filters.py                    the ISO 19030 valid_flag gate
  curated/corrections.py                ISO 15016 wind/wave — and the empirical WIND_DIRECTION verdict
  curated/daily.py                      fact_performance_daily: the spine every other table reads
  curated/compute.py                    the orchestrator → {table_name: rows}
  jsonl.py uploader.py                  JSONL writer, put raw/ + curated/ trees to S3
lambda_function/athena_query/           sync query Lambda (router + pydantic handler + SSM/Athena I/O)
lambda_function/async_query_api/        async REST API Lambda (aws-lambda-powertools resolver)
scripts/export-requirements.sh          pin lambda deps into requirements.txt
web/                                    Dashboard — no-build Vue 3 + D3 static app
doc/                                    dataset · synthetic-dataset · curated-dataset · schema · vessel · iso-19030
tests/unit/                             offline suite (boto3 mocked; no AWS/network)
tests/e2e/                              live suite against the deployed API (auto-skips offline)
```

`boto3` is provided by the Lambda runtime, so it is a dev-group dependency only
(not a runtime dep).

## Configuration

`conf/<env>.conf` (HOCON) drives the deploy. `conf/dev.conf` includes `default.conf`:

| Key | Meaning |
|---|---|
| `app.athena.database` | Glue database the stack creates and Athena queries (`ym_hackathon`). |
| `app.athena.catalog` | Data source catalog (default `AwsDataCatalog`). |
| `app.athena.workgroup_name` | Name of the WorkGroup this stack creates. |
| `app.athena.source_bucket_arns` | Extra S3 bucket ARNs Athena reads from. The data-lake bucket is granted automatically, so this stays `[]`. |

At deploy time the stack writes the non-secret Athena settings to SSM at
`/ym-hackathon/athena-config` as JSON `{"database","catalog","workgroup"}`; the
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
AWS_PROFILE=ym-hackathon npx aws-cdk@latest synth  -c env=dev  # inspect the template
AWS_PROFILE=ym-hackathon npx aws-cdk@latest deploy -c env=dev  # note the CfnOutputs
```

The stack (`deployment/athena_tool_stack.py`) provisions:

- **Data lake** — a Glue database (`ym_hackathon`) over a raw + curated S3 bucket.
  **All 20 tables are flat, unpartitioned `EXTERNAL_TABLE`s** using the OpenX JSON
  SerDe over one JSONL file each, at `s3://<bucket>/{raw,curated}/<table>/`. No
  partition projection, no crawler, no `MSCK`. Column dictionary:
  [`doc/schema.md`](doc/schema.md).
- **Athena** — a WorkGroup, its results bucket, and a Lambda that runs SQL against
  Athena via boto3 (SSM runtime config + IAM).
- **Async query API** — a DynamoDB query registry (TTL), a second Lambda
  (`async_query_api`, aws-lambda-powertools REST resolver), and a REST API Gateway
  (`x-api-key` auth, CORS allow-all) implementing submit → poll → page.

**Outputs:** `DataLakeBucketName` (upload target), `AthenaQueryFunctionArn`
(sync invoke), `AthenaResultsBucketName`, and — for the async API —
`AsyncQueryApiUrl`, `AsyncQueryApiKeyId`, `QueryRegistryTableName`.

## 2. Build the data lake

One command, reading the three source files under `./dataset` (`vt_fd.csv`,
`maintenance.csv`, `vessel.jsonl`) and writing all 20 tables:

```bash
# fully offline — writes ./tmp/{raw,curated}/<table>/<table>.jsonl
uv run python -m ym_datalake.etl build

# same, uploading every table to s3://<bucket>/{raw,curated}/
AWS_PROFILE=ym-hackathon uv run python -m ym_datalake.etl build --upload
```

Flags: `--data` (source dir, default `./dataset`), `--out` (default `./tmp`),
`--seed` (default `42` — moves only the estimated columns), `--upload`, `--bucket`
(falls back to `app.datalake.bucket_name` from `conf/<env>.conf`), `--env` (default
`dev`), `--region` (default `us-west-2`). Re-running is safe: the same S3 keys are
overwritten.

The build prints per-table row counts and the three findings that decide whether any
of the ISO numbers mean anything — the duplicate count (344), the ISO-valid row count
(4,657), and the empirically-chosen wind convention with all three of its scores.

## 3. Query / verify Athena

Once uploaded, the tables are immediately queryable — nothing is partitioned, so there
is no partition load step and no partition predicate to write. Query via the Athena
console, the `aws athena` CLI, or the deployed sync Lambda:

```bash
aws lambda invoke --function-name <AthenaQueryFunctionArn> \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"run_query","sql":"SELECT count(*) AS n FROM noon_report WHERE ship_id='\''S4'\''"}' \
  out.json
# out.json → {"query_execution_id":"...","columns":["n"],"rows":[["1461"]],"row_count":1}
```

Payload fields: `action` (`run_query`), `sql` (required), `max_rows` (default 1000),
optional `database` / `catalog` overrides. Curated tables query the same way — only the
`sql` changes:

```bash
# fact_performance_daily — ISO-valid speed-loss points for one ship
... "sql":"SELECT report_date, speed_loss_pct FROM fact_performance_daily WHERE ship_id='\''S4'\'' AND valid_flag ORDER BY noon_utc"

# dim_vessel — the flat vessel dimension
... "sql":"SELECT ship_id, hull_class, propeller_variant, dwt FROM dim_vessel ORDER BY ship_id"

# agg_fleet_daily — ALWAYS filter fleet_id, or the 'ALL' rollup double-counts
... "sql":"SELECT report_date, n_vessels, avg_speed_loss_pct FROM agg_fleet_daily WHERE fleet_id='\''ALL'\'' ORDER BY noon_utc DESC LIMIT 5"

# fact_anomaly — anomaly count by cause for one ship
... "sql":"SELECT cause, count(*) AS n FROM fact_anomaly WHERE ship_id='\''S4'\'' GROUP BY cause ORDER BY n DESC"

# fact_recommendation — recommended cleaning day + net saving per ship
... "sql":"SELECT ship_id, recommended_clean_date, trigger_eta_day, net_saving_usd FROM fact_recommendation WHERE ship_id='\''S4'\''"
```

More worked queries — and every column of every table — in
[`doc/schema.md`](doc/schema.md).

## 4. Async query API

The Dashboard doesn't invoke the Lambda directly — Athena runs can exceed API
Gateway's 29s sync cap, so the API is **async**: submit a query, poll its status, then
page the results inline. Clients never write SQL; they pick a `query_type` from an
allow-list of predefined, parameterized queries (all binds via Athena `?` placeholders
— no string interpolation), which the API validates (pydantic) before starting the
query.

**Full reference — every `query_type`, its params, and its response shape:**
[`doc/api.md`](doc/api.md).

| Method | Path | Returns |
|---|---|---|
| `POST` | `/queries` | `202 {query_id, status:"PENDING"}` |
| `GET` | `/queries/{query_id}` | `200 {query_id, status, result_location?}` — status is `PENDING`/`RUNNING`/`SUCCEEDED`/`FAILED` |
| `GET` | `/queries/{query_id}/results?page_token=` | `200 {query_id, columns, rows, next_page_token?}` (`409` until `SUCCEEDED`) |

Query types are named after the table they serve (`fact_performance_daily`,
`fact_anomaly`, `agg_fleet_daily`, `noon_report`, `predict_targets`, …) and are keyed on
**`ship_id`**, matching the catalog in [`doc/schema.md`](doc/schema.md).

Auth is `x-api-key` (throttled by a usage plan); the API stage is `prod`, so URLs are
`…/prod/queries`. The query registry (`query_id` → Athena execution id, type, status)
lives in DynamoDB with a 24h TTL that auto-cleans old records.

### Call flow

Deploy ([§1](#1-deploy-cdk)), [build and upload the lake](#2-build-the-data-lake), then
grab the URL + key from the stack outputs:

```bash
URL=$(AWS_PROFILE=ym-hackathon aws cloudformation describe-stacks --stack-name YmHackathonAthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiUrl'].OutputValue" --output text)
KEY_ID=$(AWS_PROFILE=ym-hackathon aws cloudformation describe-stacks --stack-name YmHackathonAthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiKeyId'].OutputValue" --output text)
KEY=$(AWS_PROFILE=ym-hackathon aws apigateway get-api-key --api-key "$KEY_ID" \
  --include-value --query value --output text)

# 1. submit → {query_id, status:"PENDING"}
QID=$(curl -s -XPOST "${URL}queries" -H "x-api-key: $KEY" -H 'content-type: application/json' \
  -d '{"query_type":"fact_recommendation","params":{"ship_id":"S4"}}' | jq -r .query_id)

# 2. poll until SUCCEEDED
curl -s "${URL}queries/$QID" -H "x-api-key: $KEY"             # {"query_id":...,"status":"RUNNING"}

# 3. page results inline (follow next_page_token if present)
curl -s "${URL}queries/$QID/results" -H "x-api-key: $KEY"     # {"columns":[...],"rows":[[...]]}
```

The `async_query_api` Lambda is self-contained (its own `config.py` I/O boundary,
`pyproject.toml`, and Docker-bundled `requirements.txt`), mirroring `athena_query`.
Unit tests live under `tests/unit/lambda_function/async_query_api/`.

> **Athena string binds:** every `query_type` binds user values via Athena `?`
> execution parameters (never string-interpolated). Athena parses each parameter as a
> SQL literal, so string values must be single-quoted — `config._str_literal` wraps
> every bind as a quoted, quote-escaped literal (a bare `S4` would otherwise fail to
> parse, `2024-01-01` would read as arithmetic, failing `TYPE_MISMATCH` against the
> varchar column).

### End-to-end tests

`tests/e2e/` exercises the **live** deployed API — submit → poll → page results —
across every `query_type`, plus pagination (`next_page_token`) and the 400 / 403 /
404 / 409 error paths. The suite resolves the API URL + key straight from the
`YmHackathonAthenaToolStack` CloudFormation outputs (via boto3 — no manual copying), so it needs
AWS credentials and a deployed stack **with the lake uploaded** (otherwise queries
succeed but return no rows). It is marked `e2e` and **auto-skips** when the stack or
credentials are unavailable, so a plain `pytest` stays green offline.

```bash
AWS_PROFILE=ym-hackathon uv run pytest -s -m e2e tests/e2e/
```

Overridable via env: `E2E_STACK_NAME` (default `YmHackathonAthenaToolStack`) and the standard
AWS region vars (default `us-west-2`). The suite uses only the Python stdlib HTTP
client (`urllib`) plus boto3 (already a dev dep) for output discovery.

## 5. Dashboard

`web/` is the Dashboard frontend — a **no-build** static app (Vue 3 +
D3 v7 via CDN/ESM import map; Tailwind prebuilt into `web/tailwind.css`) that the browser serves from localhost
and that calls the **deployed** async query API directly (CORS is allow-all; auth is
the `x-api-key`), consuming all 18 `query_type`s. A fleet picker (`ALL` + the
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

python -m http.server 8000 -d web         # ES modules need http://, not file://
# open http://localhost:8000
```

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

**Not built (documented omissions):** **Reports** (GenAI).

## Documentation

Start at the top; each doc answers one question.

| Doc | Answers |
|---|---|
| [`doc/dataset.md`](doc/dataset.md) | **What is in `dataset/`?** The three source files — grain, counts, fill rates, and the five traps that will corrupt a result if you miss them. |
| [`doc/synthetic-dataset.md`](doc/synthetic-dataset.md) | **What did we make up, and how?** Every estimated column, both RNG call sites, and how to reproduce them. |
| [`doc/curated-dataset.md`](doc/curated-dataset.md) | **What does the ETL compute?** The DAG, a section per module, and *why* each non-obvious call was made. |
| [`doc/schema.md`](doc/schema.md) | **What are the 20 tables?** Full column dictionary, provenance tags, enums, worked Athena queries. |
| [`doc/vessel.md`](doc/vessel.md) | How `dataset/vessel.jsonl` was reverse-engineered from `vt_fd.csv`, column by column. |
| [`doc/vessel_particulars.md`](doc/vessel_particulars.md) | The hull-particulars inference working note (Chinese). |
| [`doc/iso-19030.md`](doc/iso-19030.md) | The speed-loss standard the pipeline implements. |
| [`doc/glossary.md`](doc/glossary.md) | Terms, units, and abbreviations. |
| [`doc/api.md`](doc/api.md) | Async query API — every `query_type`, its params, and its response shape. |
