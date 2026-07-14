"""I/O layer: SSM provider + Athena client. This is the mocking boundary for tests."""

import json
import logging
import os
import time

import boto3
from aws_lambda_powertools.utilities.parameters import SSMProvider

logger = logging.getLogger(__name__)

SSM_PREFIX = '/ym-hackathon'

# Athena moves through QUEUED/RUNNING before reaching a terminal state.
_TERMINAL_STATES = {'SUCCEEDED', 'FAILED', 'CANCELLED'}
_POLL_INTERVAL_SECONDS = 1.0

_ssm_endpoint = os.environ.get('SSM_ENDPOINT_URL')
ssm = SSMProvider(boto3_client=boto3.client('ssm', endpoint_url=_ssm_endpoint)) if _ssm_endpoint else SSMProvider()
athena = boto3.client('athena')


def get_athena_config() -> dict:
    """Read Athena runtime config from SSM. SSMProvider's max_age handles caching."""
    return json.loads(ssm.get(f'{SSM_PREFIX}/athena-config', max_age=1800))


def run_query(
    sql: str,
    *,
    database: str,
    catalog: str,
    workgroup: str,
    max_rows: int,
    action: str,
) -> dict:
    """Run ``sql`` on Athena and return ``{query_execution_id, columns, rows, row_count}``.

    Starts the query, polls to completion, then reads up to ``max_rows`` result rows.
    Raises on any non-SUCCEEDED terminal state.
    """
    context = {'Database': database} if database else {}
    if catalog:
        context['Catalog'] = catalog

    start = athena.start_query_execution(
        QueryString=sql,
        QueryExecutionContext=context,
        WorkGroup=workgroup,
    )
    query_execution_id = start['QueryExecutionId']

    state = _wait_for_completion(query_execution_id, action=action)
    if state != 'SUCCEEDED':
        raise RuntimeError(f'{action} query {query_execution_id} ended in state {state}')

    columns, rows = _fetch_results(query_execution_id, max_rows=max_rows)
    return {
        'query_execution_id': query_execution_id,
        'columns': columns,
        'rows': rows,
        'row_count': len(rows),
    }


def _wait_for_completion(query_execution_id: str, *, action: str) -> str:
    """Poll get_query_execution until a terminal state; log + return the state."""
    while True:
        execution = athena.get_query_execution(QueryExecutionId=query_execution_id)
        status = execution['QueryExecution']['Status']
        state = status['State']
        if state in _TERMINAL_STATES:
            if state != 'SUCCEEDED':
                reason = status.get('StateChangeReason', '')
                logger.error('%s query %s failed (state=%s): %s', action, query_execution_id, state, reason)
            return state
        time.sleep(_POLL_INTERVAL_SECONDS)


def _fetch_results(query_execution_id: str, *, max_rows: int) -> tuple[list[str], list[list[str]]]:
    """Read paginated results, capping at ``max_rows``. Skips the header row."""
    columns: list[str] = []
    rows: list[list[str]] = []
    next_token: str | None = None
    first_page = True

    while len(rows) < max_rows:
        kwargs = {'QueryExecutionId': query_execution_id, 'MaxResults': min(1000, max_rows - len(rows) + 1)}
        if next_token:
            kwargs['NextToken'] = next_token
        result = athena.get_query_results(**kwargs)
        result_set = result['ResultSet']

        if first_page:
            column_info = result_set.get('ResultSetMetadata', {}).get('ColumnInfo', [])
            columns = [c['Name'] for c in column_info]

        page_rows = result_set.get('Rows', [])
        # Athena repeats the column-name header as the first row of the first page.
        if first_page and page_rows:
            page_rows = page_rows[1:]
        first_page = False

        for row in page_rows:
            if len(rows) >= max_rows:
                break
            rows.append([cell.get('VarCharValue') for cell in row.get('Data', [])])

        next_token = result.get('NextToken')
        if not next_token:
            break

    return columns, rows
