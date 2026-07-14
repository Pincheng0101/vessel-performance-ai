"""YangMing vessel-performance GenBI agent on Bedrock AgentCore Runtime.

Two tools: ``load_genbi_skill`` (the 20-table catalog in ``skill.md``) and
``athena_query`` (a boto3 call in the runtime's own execution role, so no
connector / cross-account assume-role is needed).

Environment (all optional):
    ATHENA_DATABASE   Glue database to query        (default ``ym_hackathon``)
    ATHENA_WORKGROUP  Athena workgroup              (default ``ym-hackathon-workgroup``)
    ATHENA_CATALOG    data source catalog           (default ``AwsDataCatalog``)
    ATHENA_OUTPUT     s3://… query-result location  (default: workgroup default)
    BEDROCK_MODEL_ID  inference profile             (default ``global.anthropic.claude-sonnet-4-6``)
"""

import json
import os
import pathlib
import time

import boto3
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models import BedrockModel

DATABASE = os.environ.get('ATHENA_DATABASE', 'ym_hackathon')
WORKGROUP = os.environ.get('ATHENA_WORKGROUP', 'ym-hackathon-workgroup')
CATALOG = os.environ.get('ATHENA_CATALOG', 'AwsDataCatalog')
OUTPUT_LOCATION = os.environ.get('ATHENA_OUTPUT')  # None → workgroup default
MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'global.anthropic.claude-sonnet-4-6')

MAX_ROWS = 100
POLL_INTERVAL_S = 1.0
TIMEOUT_S = 120

SKILL_MD = (pathlib.Path(__file__).parent / 'skill.md').read_text(encoding='utf-8')

SYSTEM_PROMPT = f"""# YangMing Marine Transport Corp. — Vessel-Performance GenBI Analyst

You are a GenBI (generative BI) analyst for YangMing Marine Transport Corp (陽明海運). You answer
questions about **fleet and vessel performance** — speed, slip, fuel consumption (SFOC), weather
effects, hull/propeller degradation, maintenance history and effect — by writing SQL against the
`{DATABASE}` Athena data lake and interpreting the results for the user.

**Reply in the language of the user's latest message — re-decide on every turn from that message
alone.** If the latest message is in Chinese, reply in Traditional Chinese (never Simplified). Keep
standard technical terms (speed loss, slip, SFOC, Noon Report, UWI) in their original language.

## Domain background

The lake is **20 tables** covering ~5 years of a **15-ship container fleet** (`S1`–`S12` train,
`S21`–`S23` predict): **6 raw** — the source Noon Reports (`noon_report`, 21,282 rows, landed
verbatim), vessel particulars, maintenance events, plus a fitted reference curve, the UWI
inspections and a synthesized bunker-price series — and **14 curated**, where the analytics live
(`fact_performance_daily` is the spine; also voyages, ISO 19030 indicators, anomalies, alerts,
maintenance economics, CII, speed profiles, fleet rollups).

You have two jobs, equally weighted:

1. **Fleet-performance BI** over the curated zone — ISO 19030 speed loss, hull fouling,
   maintenance effect & payback, CII rating, excess fuel cost, alerts, recommendations, and
   slow-steaming speed profiles.
2. **The hackathon fuel-prediction task** — `masked_flag` rows on `noon_report` (S21–S23) have
   their fuel consumption blanked; `predict_fuel_type` names the target column. Exclude them from
   any consumption statistic.

Cross-cutting facts:

- **Nothing is partitioned.** `ship_id` is an ordinary column; never write a partition predicate.
- Time is a **relative-day integer** (`noon_utc` / `event_day` / `inspection_day`, day 0 … 1825).
  The curated zone adds a calendar (`report_date`, epoch day 0 = 2021-07-01) — but that epoch is
  itself an **estimate**.
- **Estimated ≠ fact.** The calendar epoch, all geography (lat/lon/ports), all USD figures, the
  IMO numbers and the UWI numeric signals are **synthesized**. Present them as modelled figures;
  never quote them as fact. The skill tags them `(est.)`.
- Raw `noon_report` is verbatim — duplicates and speed outliers included. Prefer the curated
  `fact_performance_daily` (deduped, clipped) for analytics.

## Tools

- **`load_genbi_skill` tool** — the table catalog: all 20 tables, every column, the traps, the
  enums, and worked queries. **Load it before writing any SQL.**
- **`athena_query` tool** — runs one SQL statement: pass the SELECT as `query`. The database,
  workgroup, and catalog are pre-configured; reference tables by bare name.

## Process

1. **Load the skill**, identify the right table(s) and columns for the question.
2. **Write one SELECT** following the skill's traps — most importantly: filter `fleet_id` on
   `agg_fleet_daily` (it carries an `'ALL'` rollup row), filter `valid_flag` for any speed-loss /
   hull-condition work, and `NOT masked_flag` on consumption statistics.
3. **Run it** with `athena_query`. If it errors, read the message, fix the SQL, retry (≤3 attempts).
4. **Answer** in the user's language: a short conclusion first, then the key numbers (small Markdown
   table when helpful), then a one-line interpretation (e.g. what a rising slip/SFOC trend means).
   State the ship and day range you queried.

## Rules

- **SELECT only.** Never write DDL/DML (no CREATE/INSERT/DROP/UPDATE). One statement per call.
- Query only tables and columns that exist in the skill. If the question can't be answered from the
  lake, say so plainly — do not invent data.
- Keep result sets small: aggregate in SQL and use `LIMIT` (≤ 100 rows unless the user asks for more).
- If a question mixes several topics, answer them with separate queries rather than one giant join.
"""


@tool
def load_genbi_skill() -> str:
    """Load the ym-datalake GenBI skill: the full table catalog (all 20 tables, every column,
    grain and row count), the traps that turn into wrong answers, the enum reference, and worked
    queries. Call this before writing any SQL."""
    return SKILL_MD


@tool
def athena_query(query: str) -> str:
    """Run one read-only SQL query against the vessel-performance data lake (Athena).
    Pass a single SELECT statement as `query`. The database, workgroup, and catalog are
    pre-configured; reference tables by bare name. Load the GenBI skill first for the
    table catalog, the traps, and sample queries.

    Args:
        query: One SELECT (or WITH … SELECT) statement.
    """
    stripped = query.strip().rstrip(';').strip()
    head = stripped.split(None, 1)[0].upper() if stripped else ''
    if head not in ('SELECT', 'WITH'):
        return json.dumps({'error': 'Read-only tool: only a single SELECT (or WITH … SELECT) statement is allowed.'})

    athena = boto3.client('athena')
    params = {
        'QueryString': stripped,
        'QueryExecutionContext': {'Database': DATABASE, 'Catalog': CATALOG},
        'WorkGroup': WORKGROUP,
    }
    if OUTPUT_LOCATION:
        params['ResultConfiguration'] = {'OutputLocation': OUTPUT_LOCATION}

    try:
        qid = athena.start_query_execution(**params)['QueryExecutionId']
    except Exception as e:  # noqa: BLE001 — surface the Athena error to the model
        return json.dumps({'error': str(e)})

    deadline = time.time() + TIMEOUT_S
    while True:
        state = athena.get_query_execution(QueryExecutionId=qid)['QueryExecution']['Status']
        if state['State'] in ('SUCCEEDED', 'FAILED', 'CANCELLED'):
            break
        if time.time() > deadline:
            athena.stop_query_execution(QueryExecutionId=qid)
            return json.dumps({'error': f'Query timed out after {TIMEOUT_S}s', 'query_execution_id': qid})
        time.sleep(POLL_INTERVAL_S)

    if state['State'] != 'SUCCEEDED':
        return json.dumps({'error': state.get('StateChangeReason', state['State']), 'query_execution_id': qid})

    result = athena.get_query_results(QueryExecutionId=qid, MaxResults=MAX_ROWS + 1)
    rows = result['ResultSet']['Rows']
    if not rows:
        return json.dumps({'columns': [], 'rows': [], 'row_count': 0})
    columns = [c.get('VarCharValue', '') for c in rows[0]['Data']]
    data = [[c.get('VarCharValue') for c in r['Data']] for r in rows[1:]]
    return json.dumps(
        {'columns': columns, 'rows': data, 'row_count': len(data), 'truncated': 'NextToken' in result},
        ensure_ascii=False,
    )


app = BedrockAgentCoreApp()

agent = Agent(
    model=BedrockModel(model_id=MODEL_ID, max_tokens=8192),
    system_prompt=SYSTEM_PROMPT,
    tools=[load_genbi_skill, athena_query],
)


@app.entrypoint
async def invoke(payload):
    """AgentCore Runtime entrypoint: {"prompt": "..."} → SSE stream of answer chunks.

    An async generator makes the runtime stream (text/event-stream): each yielded
    string becomes one SSE ``data:`` chunk, so the frontend can render text deltas
    as they are generated instead of waiting for the full answer.
    """
    prompt = payload.get('prompt', '')
    if not prompt:
        yield {'error': "Missing 'prompt' in payload."}
        return
    seen_tools: set[str] = set()
    async for event in agent.stream_async(prompt):
        if not isinstance(event, dict):
            continue
        # Surface tool activity so the frontend can show progress between text. Strands re-emits
        # current_tool_use on every input-delta chunk (and never alongside `start`), so announce
        # each tool once, on the first chunk that names it.
        tool_use = event.get('current_tool_use')
        if tool_use and tool_use.get('name') and tool_use.get('toolUseId') not in seen_tools:
            seen_tools.add(tool_use['toolUseId'])
            yield {'tool': tool_use['name']}
        if 'data' in event:
            yield event['data']  # text delta


if __name__ == '__main__':
    app.run()
