# GenBI Agent (`ym-datalake-genbi-agent`)

A text-to-SQL agent on the LangForge Enterprise (LFE) platform that answers natural-language
questions from the **YM Fleet Performance Dashboard** — speed loss, CII, anomalies/alerts,
maintenance recommendations, voyage economics, optimizer speeds — by running read-only Athena
SQL against the `ym_datalake_poc` data lake and interpreting the results (Traditional Chinese
or English, following the user).

The agent's skill embeds the exact SQL behind every dashboard panel (mirrored from
`lambda_function/async_query_api/queries.py`), so its answers match the dashboard numbers.

## Create / update

```bash
cp .env.example .env        # once — fill in LFE_BASE_URL, LFE_API_KEY, AWS account/role
uv run python scripts/lfe_register.py
```

Side effects: creates or updates 4 resources **on the remote LFE API** (nothing else) in
dependency order — connector → llm → skill → agent — and prints their ids. Idempotent:
resources are matched by name (`list-*`), existing ones are updated in place, ids are stable.
Re-run after editing any file under `lfe_resource/`.

Prerequisite: the `AthenaToolStack` must be deployed (`ym-datalake-poc-genbi-athena` IAM role —
CfnOutput `GenBiAthenaRoleName`) with M1–M3 data uploaded, else the agent's queries return
empty results.

`.env` keys (git-ignored; `.env.example` is the template; shell environment wins over the file):

| Key | Value |
|---|---|
| `LFE_BASE_URL` / `LFE_API_KEY` | LFE API endpoint + key (ask the LFE operator) |
| `LFE_AUTH_TOKEN` | optional bearer token |
| `YM_DATALAKE_AWS_ACCOUNT_ID` | account hosting the data lake (= LFE's account) |
| `YM_DATALAKE_ATHENA_ROLE_NAME` | `ym-datalake-poc-genbi-athena` |

## Resource files (`lfe_resource/`)

| File | Resource | Purpose |
|---|---|---|
| `agent/ym-datalake-genbi-agent.json` | agent | wires prompt + skill + `athena_client` tool (db `ym_datalake_poc`, workgroup `ym-datalake-poc`, `read_only: true`) |
| `agent/prompts/ym-datalake-genbi-agent.md` | — | agent prompt: role, domain background, dashboard context, tool usage, answer rules |
| `skill/ym-datalake-genbi-skill.{json,md}` | skill | table catalog, partition-pruning rules, sample-question mapping, per-dashboard-panel SQL |
| `llm/ym-datalake-genbi-llm.json` | llm | Bedrock Claude (us-west-2) |
| `connector/ym-datalake-aws-connector.json` | connector | AWS auth for the Athena tool: assumes `ym-datalake-poc-genbi-athena` in us-west-2 via `${env:…}` values |

Placeholders in the JSON bodies — `${file:path}` (inline a file), `${env:KEY}`, and
`${llm:name}` / `${skill:name}` / `${connector:name}` (id of a resource created earlier in the
same run) — are resolved by `scripts/lfe_register.py` at registration time; secrets never land
in the repo.

## Maintenance invariants

- **Schema changes** (new table/column in the lake) → update `skill/ym-datalake-genbi-skill.md`
  (table index + panel SQL) alongside `doc/table-schema.md` / `doc/skill/`, then re-register.
- **Dashboard query changes** (`lambda_function/async_query_api/queries.py`) → mirror them in
  the skill's "Dashboard queries" section, or agent answers drift from the dashboard.
- Renaming a resource: rename it remotely too (or delete the old one) before re-registering —
  the script matches by name, so a local rename alone creates a duplicate.
- The Athena tool is guarded `read_only: true` (SELECT/SHOW/DESCRIBE only); IAM remains the
  real boundary.

## Demo questions

1. 「YM WELLNESS 最近一年的 speed loss 趨勢如何？什麼時候需要清洗船體？」
2. 「全船隊現在的健康狀況如何？CII 評級分布？哪些船需要優先維修？」
3. 「Optimizer 建議 YM WELLNESS 用什麼航速？一年可以省多少錢？」

## Troubleshooting

| Symptom | Check |
|---|---|
| Queries fail with Athena access error | role trust policy (LFE runtime must be able to assume `ym-datalake-poc-genbi-athena`); role exists (deploy `AthenaToolStack`) |
| Queries succeed but return no rows | M1–M3 data uploaded to the lake? (README §2–3) |
| `PlaceholderError: ${env:…}` | key missing from `.env` / environment |
| Register creates a duplicate instead of updating | remote resource was renamed/deleted — align names, delete strays in the LFE console |
