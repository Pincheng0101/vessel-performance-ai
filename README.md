# ym-hackathon

陽明海運 (Yang Ming) AI 船舶效能分析 (vessel-performance analytics) — the data lake, query
API and GenBI agent over the **real hackathon dataset**: hull fouling and propeller
roughness against propulsion performance, under ISO 19030.

The ETL runs **locally** (stdlib only, no AWS) to turn the three source files in `dataset/`
into 20 flat tables; four CDK stacks then land them in S3 and expose them through Athena, an
async REST API, a Bedrock AgentCore agent, and a CloudFront-hosted dashboard.

**New here? Start with [`doc/dataset.md`](doc/dataset.md)** — what is actually in the data.

## Architecture

| Component | What it delivers | Where |
|---|---|---|
| **ETL** | 3 source files → 20 flat tables (clean · ISO 15016/19030 · CII · anomalies · recommendations) | `ym_datalake/etl/` |
| **Catalog** | Glue database + Athena WorkGroup — 20 flat, **unpartitioned** tables, no crawler | `deployment/athena_tool_stack.py` |
| **Sync Lambda** | `run_query` — arbitrary SQL against Athena, for humans and scripts | `lambda_function/athena_query/` |
| **Async API** | API Gateway + Lambda + DynamoDB registry — 23 predefined query types (submit → poll → page) | `lambda_function/async_query_api/` |
| **GenBI agent** | Strands agent on Bedrock AgentCore — natural language → SQL → answer, streamed over SSE | `agentcore/` |
| **Dashboard** | Nuxt 4 SPA — offline fixture-backed charts + live GenBI copilot chat | `web/` |
| **UI hosting** | Private S3 + CloudFront (OAC) serving the built SPA | `deployment/ui_stack.py` |

Region is **`us-west-2`**. Four stacks, all named from `app.project_name` (`YmHackathon`):
`YmHackathonAthenaToolStack`, `YmHackathonUiStack`, `YmHackathonGenbiAgentAuthStack`,
`YmHackathonGenbiAgentRuntimeStack`.

## Prerequisites

| Tool | Used for | Notes |
|---|---|---|
| Python 3.13 + [`uv`](https://docs.astral.sh/uv/) | ETL, tests, the CDK app itself | `>=3.13,<3.14` |
| Node.js + `npm` | CDK CLI | pinned in `package.json`; `npm ci` → `./node_modules/.bin/cdk` |
| Node 24 (`web/.nvmrc` → `v24.11.0`) + npm ≥ 11.10 | the `web/` dashboard | `corepack enable npm`; separate npm tree from the root CDK pin |
| Docker | bundling at `cdk deploy` | both Lambdas **and** the agent code asset (linux/arm64); must be running |
| AWS credentials | deploy + upload + query | examples use `AWS_PROFILE=ym-hackathon`; account must be CDK-bootstrapped |

Building the data lake needs **none** of the AWS tooling — only `uv`. AWS is required only to
deploy, upload, and query.

## Quick start

The happy path, in order. Note the **two deploys**: `conf/dev.conf` carries the data-lake
bucket name, and that name only exists after the first deploy — the GenBI agent's role gets
its S3 read grant from that key, so it has to be filled in and re-deployed.

```bash
uv sync && npm ci

export AWS_PROFILE=ym-hackathon
CDK=./node_modules/.bin/cdk

# 1. Deploy all four stacks
$CDK deploy --all -c env=dev

# 2. Copy the AthenaToolStack `DataLakeBucketName` output into conf/dev.conf
#    (app.datalake.bucket_name), then redeploy so the agent can read the lake
$CDK deploy --all -c env=dev

# 3. Build all 20 tables from ./dataset and upload them to that bucket
uv run python -m ym_datalake.etl build --upload

# 4. Run the dashboard (offline — no AWS, no .env)
cd web && npm ci && npm run dev
```

The lake is now queryable — no crawler, no `MSCK`, no partitions. Drop `--upload` from step 3
to build the whole lake **fully offline** under `./tmp/` without touching AWS.

## 1. Deploy (CDK)

```bash
npm ci                                                   # CDK CLI (pinned in package.json)
uv sync                                                  # Python deps (incl. aws-cdk-lib)

AWS_PROFILE=ym-hackathon ./node_modules/.bin/cdk synth -c env=dev            # inspect
AWS_PROFILE=ym-hackathon ./node_modules/.bin/cdk deploy --all -c env=dev     # note the outputs
```

`-c env=<env>` is **required** (`app.py` raises without it) and selects `conf/<env>.conf`.

Run `bash scripts/export-requirements.sh` only when the **Lambda** dependencies change — it
re-pins `lambda_function/*/requirements.txt` from their `pyproject.toml`. It does *not* cover
the agent; `agentcore/requirements.txt` is exported separately with
`uv export --project agentcore --no-dev --no-emit-project -o agentcore/requirements.txt`.

| Stack | Provisions | CfnOutputs |
|---|---|---|
| `YmHackathonAthenaToolStack` | data-lake bucket, Glue DB + 20 external tables, Athena WorkGroup + results bucket, sync Lambda, async API (Lambda + DynamoDB + API Gateway), SSM config | `DataLakeBucketName` · `AthenaQueryFunctionArn` · `AthenaResultsBucketName` · `AsyncQueryApiUrl` · `AsyncQueryApiKeyId` · `QueryRegistryTableName` |
| `YmHackathonUiStack` | private S3 origin + CloudFront (OAC), SPA fallback | `UiBucketName` · `UiDistributionId` · `UiDistributionDomainName` · `UiUrl` |
| `YmHackathonGenbiAgentAuthStack` | Cognito user pool, domain, resource server, M2M client | `UserPoolId` · `ClientId` · `DiscoveryUrl` · `TokenEndpoint` · `TokenScope` |
| `YmHackathonGenbiAgentRuntimeStack` | AgentCore runtime (arm64 zip code asset) + execution role, JWT authorizer | `RuntimeArn` · `RuntimeId` |

Auth is split from the runtime on purpose: redeploying the agent must never risk recreating
the user pool and rotating the client id/secret the frontend holds.

CI: `.gitlab-ci.yml` runs the same `cdk deploy --all -c env=dev` on `main` — pipeline is
created on push, the deploy job waits for a **manual** ▶️ click.

## 2. Build the data lake (ETL)

One command, reading `dataset/{vt_fd.csv, maintenance.csv, vessel.jsonl}` and writing all 20
tables. There is one command because there is one pipeline: `reference_curve` cannot be fitted
without the cleaned, environment-corrected daily spine, so splitting "load" from "compute"
would only mean computing the same thing twice (see `ym_datalake/etl/curated/compute.py`).

```bash
# fully offline — writes ./tmp/{raw,curated}/<table>/<table>.jsonl
uv run python -m ym_datalake.etl build

# same, plus upload every table to s3://<bucket>/{raw,curated}/
AWS_PROFILE=ym-hackathon uv run python -m ym_datalake.etl build --upload
```

Flags: `--data` (source dir, default `./dataset`), `--out` (default `./tmp`), `--seed`
(default `42` — moves only the estimated columns), `--upload`, `--bucket` (falls back to
`app.datalake.bucket_name` from `conf/<env>.conf`), `--env` (default `dev`), `--region`
(default `us-west-2`). Re-running is safe: the same S3 keys are overwritten.

Every table is flat and unpartitioned — 21,282 noon rows / ~4 MB is far below the size where
partition pruning pays for itself, so `ship_id` is an ordinary body column and each table is
one JSONL file.

| Zone | Tables |
|---|---|
| **raw** (6) | `noon_report` · `vessel_master` · `maintenance_event` · `reference_curve` · `uwi` · `fuel_price` |
| **curated** (14) | `fact_performance_daily` · `fact_performance_indicator` · `fact_uwi` · `fact_maintenance_event` · `dim_vessel` · `dim_reference_curve` · `dim_port` · `agg_fleet_daily` · `fact_voyage` · `fact_anomaly` · `fact_alert` · `fact_recommendation` · `fact_maintenance_recommendation` · `fact_speed_profile` |

**Raw is verbatim; all derivation happens in curated** — including the 344 duplicate rows and
the gross outliers. The build re-derives and prints three findings every run: the duplicate
count (344), the ISO 19030 valid-row count (4,657), and the empirically-chosen wind convention
with all three of its scores (*no correction* wins — the ISO 15016 term is decorative on this
dataset). Why each of those holds: [`doc/curated-dataset.md`](doc/curated-dataset.md).

## 3. Query / verify

Uploaded tables are immediately queryable — via the Athena console, the `aws athena` CLI, or
the deployed sync Lambda:

```bash
aws lambda invoke --function-name <AthenaQueryFunctionArn> \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"run_query","sql":"SELECT count(*) AS n FROM noon_report WHERE ship_id='\''S4'\''"}' \
  out.json
# out.json → {"query_execution_id":"...","columns":["n"],"rows":[["1461"]],"row_count":1}
```

Payload: `action` (`run_query`), `sql` (required), `max_rows` (default 1000), optional
`database` / `catalog` overrides. Curated tables query the same way — only the `sql` changes:

```sql
-- fact_performance_daily — ISO-valid speed-loss points for one ship
SELECT report_date, speed_loss_pct FROM fact_performance_daily WHERE ship_id='S4' AND valid_flag ORDER BY noon_utc

-- agg_fleet_daily — ALWAYS filter fleet_id, or the 'ALL' rollup double-counts
SELECT report_date, n_vessels, avg_speed_loss_pct FROM agg_fleet_daily WHERE fleet_id='ALL' ORDER BY noon_utc DESC LIMIT 5

-- fact_recommendation — recommended cleaning day + net saving per ship
SELECT ship_id, recommended_clean_date, trigger_eta_day, net_saving_usd FROM fact_recommendation WHERE ship_id='S4'
```

Every column of every table, plus more worked queries: [`doc/schema.md`](doc/schema.md).

## 4. Async query API

Athena runs can exceed API Gateway's 29s sync cap, so the API is **async**: submit a query,
poll its status, then page the results inline. Clients never write SQL — they pick a
`query_type` from an allow-list of predefined, parameterized queries, which the API validates
(pydantic) before starting the query.

| Method | Path | Key | Returns |
|---|---|---|---|
| `POST` | `/queries` | ✔ | `202 {query_id, status:"PENDING"}` |
| `GET` | `/queries/{query_id}` | ✔ | `200 {query_id, status, result_location?}` — `PENDING`/`RUNNING`/`SUCCEEDED`/`FAILED` |
| `GET` | `/queries/{query_id}/results?page_token=` | ✔ | `200 {query_id, columns, rows, next_page_token?}` (`409` until `SUCCEEDED`) |
| `GET` | `/swagger` | — | interactive API docs (public) |
| `GET` | `/openapi.json` | — | OpenAPI schema (public) |

**23 query types**: one per catalog table (20), plus three derived — `fleet_positions`,
`ship_speed_power`, `predict_targets`. Most are keyed on `ship_id`. Full reference — every
type, its params, and its response shape: [`doc/api.md`](doc/api.md).

Auth is `x-api-key` (throttled by a usage plan); the stage is `prod`, so URLs are
`…/prod/queries`. The registry (`query_id` → Athena execution id, type, status) lives in
DynamoDB with a 24h TTL.

```bash
S=YmHackathonAthenaToolStack
out() { aws cloudformation describe-stacks --stack-name "$1" \
  --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text; }

URL=$(out $S AsyncQueryApiUrl)
KEY=$(aws apigateway get-api-key --api-key "$(out $S AsyncQueryApiKeyId)" \
  --include-value --query value --output text)

# 1. submit → {query_id, status:"PENDING"}
QID=$(curl -s -XPOST "${URL}queries" -H "x-api-key: $KEY" -H 'content-type: application/json' \
  -d '{"query_type":"fact_recommendation","params":{"ship_id":"S4"}}' | jq -r .query_id)

# 2. poll until SUCCEEDED
curl -s "${URL}queries/$QID" -H "x-api-key: $KEY"

# 3. page results inline (follow next_page_token if present)
curl -s "${URL}queries/$QID/results" -H "x-api-key: $KEY"
```

> **Athena string binds:** every `query_type` binds user values via Athena `?` execution
> parameters (never string-interpolated); Athena parses each one as a SQL literal, so
> `config._str_literal` wraps every bind as a quoted, quote-escaped literal.

## 5. GenBI agent

`agentcore/` is a [Strands](https://strandsagents.com/) agent running on **Bedrock AgentCore
Runtime** (model `global.anthropic.claude-sonnet-4-6`): it takes a natural-language question
about the fleet, writes SQL against the lake, runs it, and streams back an answer in the user's
language. Two tools:

- **`load_genbi_skill`** — returns `agentcore/skill.md`: the 20-table catalog, every column,
  the traps, the enums, worked queries. The agent loads it before writing any SQL.
- **`athena_query`** — runs one `SELECT`/`WITH` statement (DDL/DML rejected) using the
  runtime's own execution role. No connector, no cross-account assume-role.

It deploys as part of `cdk deploy --all`: the sources + linux/arm64 deps are bundled into a zip
code asset (no container registry). **To update the agent, edit `agentcore/agent.py` or
`agentcore/skill.md` and redeploy** — the asset hash change rolls the runtime and never touches
the auth stack.

Calling it: fetch a Cognito M2M token (no user login), then POST to the runtime's invoke URL
and read the SSE stream.

```bash
AUTH=YmHackathonGenbiAgentAuthStack; RT=YmHackathonGenbiAgentRuntimeStack
out() { aws cloudformation describe-stacks --stack-name "$1" \
  --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text; }

CLIENT_ID=$(out $AUTH ClientId)
SECRET=$(aws cognito-idp describe-user-pool-client --user-pool-id "$(out $AUTH UserPoolId)" \
  --client-id "$CLIENT_ID" --query 'UserPoolClient.ClientSecret' --output text)
TOKEN=$(curl -s -XPOST "$(out $AUTH TokenEndpoint)" \
  -d grant_type=client_credentials -d client_id="$CLIENT_ID" -d client_secret="$SECRET" \
  -d scope="$(out $AUTH TokenScope)" | jq -r .access_token)          # scope: genbi/invoke

ARN=$(out $RT RuntimeArn)
curl -N -XPOST "https://bedrock-agentcore.us-west-2.amazonaws.com/runtimes/$(jq -rn --arg a "$ARN" '$a|@uri')/invocations?qualifier=DEFAULT" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -H 'accept: text/event-stream' \
  -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: $(uuidgen)$(uuidgen)" \
  -d '{"prompt":"S1 的 slip 趨勢如何？"}'
```

The session-id header is **required and must be ≥33 characters**; reuse it across calls to keep
conversation context. The access token lasts 24h. A browser client that does all of this —
token cache, SSE parsing, tool-progress events — is in `agentcore/frontend-example.js`, with a
runnable page at `agentcore/test.html`.

## 6. Dashboard (`web/`)

The SPA lives at **`web/`** — a Nuxt 4 + Vuetify app, merged in as a git subtree of
`ym-datalake-ui`. `YmHackathonUiStack` provisions only its hosting: a **private** S3 bucket read
exclusively by CloudFront through an Origin Access Control, HTTPS-only, with 403/404 →
`/index.html` (200) so the SPA's client-side routing works.

### Local dev

```bash
cd web
corepack enable npm    # .npmrc sets engine-strict=true; needs npm ≥ 11.10
npm ci
npm run dev            # → http://localhost:3000/dashboard
```

**No config needed, and no AWS.** The dashboard is **fixture-backed**:
`app/services/server/datalake.js` fetches checked-in JSON from `public/demo/{v1,v2}/`, resolving
each cache key to a filename through that directory's `index.json`. `v2` is the real hackathon
dataset (`ship_id` S1–S23, 111 files); `v1` is a frozen synthetic PoC. A live API mode is a TODO
comment, not code — so the charts render offline, with no `.env` and no deployed stack.

### `.env` — only for the copilot chat

The one live feature is the GenBI copilot chat, which throws without credentials. Only the six
`AGENTCORE_*` keys of `.env.example` are read (`SERVER_API_URL` / `SERVER_API_KEY` are inert
leftovers). Generate the file from the deployed stacks:

```bash
./scripts/generate-web-env.sh    # writes web/.env (backs up any existing one to web/.env.bak)
```

It reads the auth/runtime stack outputs, fetches the Cognito client secret, and ends with a live
token POST — `token endpoint check: HTTP 200` means the credentials work.

**Re-run it after every `YmHackathonGenbiAgentAuthStack` deploy.** The stack is
`RemovalPolicy.DESTROY`, so recreating it regenerates the Cognito app client and rotates the
client secret; a stale `web/.env` then fails the token request with a bare 400.

Nuxt reads `.env` only at startup — restart `npm run dev` after regenerating.

In GitLab this same file is the file-type CI variable `ENV_DEV`; update it with the regenerated
`.env` or deployed builds keep shipping the rotated secret.

### Regenerating the fixtures

`npm run capture` rewrites `public/demo/v2/` from the live API. It reads **differently-named**
vars — `YM_API_BASE_URL` / `YM_API_KEY` — from `web/.env.capture` (git-ignored), *not* `.env`.

> **Known break:** `scripts/capture-fixtures.mjs` still calls `${BASE}/v2/queries`, but the API no
> longer has a `/v2` prefix — the Lambda routes plain `/queries` (`async_query_api/router.py`).
> Capture fails until the `/v2` is dropped at the 3 call sites in that script.

### Lint / test

```bash
npm run lint
npm run lint:security
npm run test:unit -- --run
npm run test:integration     # Playwright
```

### Build + deploy

The upload is **manual** — `ui_stack.py` is hosting-only, with no `BucketDeployment`.

```bash
S=YmHackathonUiStack
out() { aws cloudformation describe-stacks --stack-name "$1" \
  --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text; }

cd web && npm run generate                           # static build → .output/public
aws s3 sync .output/public "s3://$(out $S UiBucketName)" --delete --exclude '*.map'
aws cloudfront create-invalidation --distribution-id "$(out $S UiDistributionId)" --paths '/*'
```

The site URL is the `UiUrl` output (the default `*.cloudfront.net` domain).

## Configuration

`conf/<env>.conf` (HOCON) drives the deploy; `conf/dev.conf` includes `default.conf`.

| Key | Meaning |
|---|---|
| `app.project_name` | Prefix on every CDK stack id (`YmHackathon`). Rename here to rename all four. |
| `app.env` / `app.region_name` | Environment label; region (`us-west-2`). |
| `app.datalake.bucket_name` | The deployed data-lake bucket. Read by the ETL `--upload` target **and** by the agent's runtime role. See the trap below. |
| `app.athena.database` | Glue database the stack creates and Athena queries (`ym_hackathon`). |
| `app.athena.catalog` | Data source catalog (default `AwsDataCatalog`). |
| `app.athena.workgroup_name` | WorkGroup this stack creates (`ym-hackathon-workgroup` in dev). |
| `app.athena.source_bucket_arns` | Extra S3 buckets Athena reads from. The data-lake bucket is granted automatically, so this stays `[]`. |
| `app.api.throttle_rate_limit` / `throttle_burst_limit` | API Gateway usage-plan throttle for the `x-api-key` (200 / 400). |

(`conf/default.conf` also defines `app.ssm_prefix`, which is **not read** — the stack hardcodes
`/ym-hackathon` in `deployment/athena_tool_stack.py`.)

At deploy time the stack writes the non-secret Athena settings to SSM at
`/ym-hackathon/athena-config` as JSON `{"database","catalog","workgroup"}`; both Lambdas read it
at invoke time (cached 30 min).

> **Ordering trap — `app.datalake.bucket_name`.** The bucket is created *by* the stack, so its
> CDK-generated name cannot be known before the first deploy, and `default.conf` has no
> `app.datalake` block at all. `deployment/agent_runtime_stack.py` attaches the agent's
> `DataLakeRead` S3 policy **only if the key is set**. On a fresh account, therefore:
> **deploy → paste the `DataLakeBucketName` output into `conf/<env>.conf` → deploy again →
> upload.** Skip the second deploy and you get an agent that can see the Glue catalog but
> cannot read a single row.

## Develop & test

```bash
uv sync
ruff check --fix . && ruff format .
uv run pytest -s tests/unit/                              # offline: AWS mocked, no creds/network
AWS_PROFILE=ym-hackathon uv run pytest -s -m e2e tests/e2e/   # live: needs a deployed stack + uploaded lake
```

`tests/e2e/` exercises the **live** API — submit → poll → page across every `query_type`, plus
pagination and the error paths (**422** invalid body/unknown type, 403 missing key, 404 unknown
`query_id`, 409 results-before-ready). It resolves the API URL + key from the
`YmHackathonAthenaToolStack` outputs via boto3 and **auto-skips** without AWS, so a plain
`pytest` stays green offline. Override with `E2E_STACK_NAME` and the standard AWS region vars.

`-m e2e` also drives the **deployed GenBI agent** (`tests/e2e/test_genbi_agent.py`): Cognito token →
`POST /invocations` → SSE → grounded answer, plus the session header and the auth/bad-payload error
paths. It needs `YmHackathonGenbiAgentAuthStack` + `YmHackathonGenbiAgentRuntimeStack` (overridable
with `E2E_AGENT_AUTH_STACK` / `E2E_AGENT_RUNTIME_STACK`) and spends Bedrock tokens; it skips the same
way when they are absent.

## Repository layout

```
app.py                                  CDK entrypoint — the 4 stacks (requires -c env=<env>)
cdk.json  package.json                  "app": "uv run python app.py";  pinned CDK CLI
.gitlab-ci.yml                          manual-trigger deploy on `main`
conf/default.conf  conf/dev.conf        HOCON per-env config (include pattern)
dataset/                                the 3 source files: vt_fd.csv, maintenance.csv, vessel.jsonl
deployment/athena_tool_stack.py         data lake + glue + athena + both lambdas + async API + SSM + IAM
deployment/ui_stack.py                  S3 + CloudFront (OAC) hosting for the web/ Nuxt dashboard
deployment/agent_auth_stack.py          Cognito user pool + M2M client for the agent's JWT auth
deployment/agent_runtime_stack.py       Bedrock AgentCore runtime (arm64 zip asset) + execution role
ym_datalake/schema.py                   the catalog: all 20 tables, every column tagged measured / class / estimated
ym_datalake/etl/                        the pipeline: 3 source files → 20 flat JSONL tables (local-only)
  __main__.py                           CLI: build
  source.py                             load the 3 sources VERBATIM (+ the maintenance `+` split)
  epoch.py fuel.py ports.py physics.py  calendar, 5-fuel constants, 10 LOCODEs, ISO 15016/19030 physics
  raw/                                  reference_curve (fitted), uwi (inspection projection), fuel_price
  curated/                              17 modules — clean (ALL mutation), filters (ISO 19030 gate),
                                        corrections, daily (the spine), then indicators, voyages,
                                        anomalies, alerts, CII, recommendations, aggregates;
                                        compute.py is the orchestrator → {table_name: rows}
  jsonl.py uploader.py                  JSONL writer, put raw/ + curated/ trees to S3
lambda_function/athena_query/           sync query Lambda (router + pydantic handler + SSM/Athena I/O)
lambda_function/async_query_api/        async REST API Lambda (aws-lambda-powertools resolver)
agentcore/                              GenBI agent: agent.py (2 tools), skill.md (the catalog it loads),
                                        frontend-example.js + test.html (browser client)
web/                                    the dashboard: Nuxt 4 SPA (git subtree of ym-datalake-ui)
  app/services/server/datalake.js       fixture-backed data service — reads public/demo/{v1,v2}
  public/demo/{v1,v2}/                  checked-in query snapshots; the dashboard runs offline
  scripts/capture-fixtures.mjs          regenerate public/demo/v2 from the live API (npm run capture)
  .env.example                          AGENTCORE_* for the copilot chat (GitLab file-var ENV_DEV)
  CLAUDE.md  .claude/rules/             the web app's own conventions
doc/                                    dataset · synthetic-dataset · curated-dataset · schema · vessel · iso-19030 · api · glossary
tests/unit/                             offline suite (boto3 mocked; no AWS/network)
tests/e2e/                              live suite against the deployed API (auto-skips offline)
scripts/                                export-requirements.sh (lambda dep pinning) + an ML fuel-prediction
yangming-aws-summit-hackathon/          pipeline (training data, models, submissions) summarized in
model_summary.md                        model_summary.md — undocumented and out of scope for this runbook
```

`boto3` is provided by the Lambda runtime, so it is a dev-group dependency only (not a runtime
dep).

## Documentation

Start at the top; each doc answers one question.

| Doc | Answers |
|---|---|
| [`doc/dataset.md`](doc/dataset.md) | **What is in `dataset/`?** The three source files — grain, counts, fill rates, and the five traps that will corrupt a result if you miss them. |
| [`doc/synthetic-dataset.md`](doc/synthetic-dataset.md) | **What did we make up, and how?** Every estimated column, both RNG call sites, and how to reproduce them. |
| [`doc/curated-dataset.md`](doc/curated-dataset.md) | **What does the ETL compute?** The DAG, a section per module, and *why* each non-obvious call was made. |
| [`doc/maintenance-optimization.md`](doc/maintenance-optimization.md) | **When does a ship get serviced, and why that date?** The hull-cleaning cost model, the five actions, and how they batch into windows. |
| [`doc/schema.md`](doc/schema.md) | **What are the 20 tables?** Full column dictionary, provenance tags, enums, worked Athena queries. |
| [`doc/vessel.md`](doc/vessel.md) | How `dataset/vessel.jsonl` was reverse-engineered from `vt_fd.csv`, column by column. |
| [`doc/vessel_particulars.md`](doc/vessel_particulars.md) | The hull-particulars inference working note (Chinese). |
| [`doc/iso-19030.md`](doc/iso-19030.md) | The speed-loss standard the pipeline implements. |
| [`doc/glossary.md`](doc/glossary.md) | Terms, units, and abbreviations. |
| [`doc/api.md`](doc/api.md) | Async query API — every `query_type`, its params, and its response shape. |
| [`web/README.md`](web/README.md) · [`web/CLAUDE.md`](web/CLAUDE.md) | **The dashboard.** How the Nuxt SPA is built and what conventions it follows — authoritative for anything under `web/`. |
