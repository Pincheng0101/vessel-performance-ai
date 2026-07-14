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
# ~240s of polling, inside the Lambda's 300s timeout: we would rather fail with the
# execution id in hand (the caller can then poll or stop the query) than be killed
# mid-poll, which loses the id and leaves the query running and billing on Athena.
_MAX_POLL_ATTEMPTS = 240
# Backstop against Athena handing back an empty page plus a NextToken forever.
_MAX_RESULT_PAGES = 50
# Athena caps get_query_results at 1000 rows per page.
_MAX_PAGE_ROWS = 1000

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

    state, statement_type = _wait_for_completion(query_execution_id, action=action)
    if state != 'SUCCEEDED':
        raise RuntimeError(f'{action} query {query_execution_id} ended in state {state}')

    columns, rows = _fetch_results(query_execution_id, max_rows=max_rows, statement_type=statement_type)
    return {
        'query_execution_id': query_execution_id,
        'columns': columns,
        'rows': rows,
        'row_count': len(rows),
    }


def _wait_for_completion(query_execution_id: str, *, action: str) -> tuple[str, str]:
    """Poll get_query_execution until a terminal state; return ``(state, statement_type)``.

    ``statement_type`` is DDL / DML / UTILITY — ``_fetch_results`` needs it to know whether
    Athena prepended a header row. Raises TimeoutError once _MAX_POLL_ATTEMPTS is exhausted.
    """
    state = 'UNKNOWN'
    for _ in range(_MAX_POLL_ATTEMPTS):
        execution = athena.get_query_execution(QueryExecutionId=query_execution_id)['QueryExecution']
        status = execution['Status']
        state = status['State']
        if state in _TERMINAL_STATES:
            if state != 'SUCCEEDED':
                reason = status.get('StateChangeReason', '')
                logger.error('%s query %s failed (state=%s): %s', action, query_execution_id, state, reason)
            return state, execution.get('StatementType', 'DML')
        time.sleep(_POLL_INTERVAL_SECONDS)

    raise TimeoutError(
        f'{action} query {query_execution_id} still {state} after '
        f'{int(_MAX_POLL_ATTEMPTS * _POLL_INTERVAL_SECONDS)}s; it is still running on Athena — '
        f'poll or stop it with this query_execution_id'
    )


def _fetch_results(query_execution_id: str, *, max_rows: int, statement_type: str) -> tuple[list[str], list[list[str]]]:
    """Read paginated results, capping at ``max_rows`` rows and _MAX_RESULT_PAGES pages."""
    columns: list[str] = []
    rows: list[list[str]] = []
    next_token: str | None = None

    for page in range(_MAX_RESULT_PAGES):
        # Athena prepends the column-name header to the first page of a DML (SELECT) result
        # set only. DDL/UTILITY statements — SHOW TABLES, DESCRIBE, SHOW PARTITIONS — carry
        # real data in row 0, so stripping it there would drop a result.
        has_header = page == 0 and statement_type == 'DML'
        kwargs = {
            'QueryExecutionId': query_execution_id,
            'MaxResults': min(_MAX_PAGE_ROWS, max_rows - len(rows) + (1 if has_header else 0)),
        }
        if next_token:
            kwargs['NextToken'] = next_token
        result = athena.get_query_results(**kwargs)
        result_set = result['ResultSet']

        if page == 0:
            column_info = result_set.get('ResultSetMetadata', {}).get('ColumnInfo', [])
            columns = [c['Name'] for c in column_info]

        page_rows = result_set.get('Rows', [])
        if has_header and page_rows:
            page_rows = page_rows[1:]

        for row in page_rows:
            if len(rows) >= max_rows:
                break
            rows.append([cell.get('VarCharValue') for cell in row.get('Data', [])])

        next_token = result.get('NextToken')
        if not next_token or len(rows) >= max_rows:
            break

    return columns, rows
