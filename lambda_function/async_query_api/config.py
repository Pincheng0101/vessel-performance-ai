"""I/O layer: SSM config + Athena client + DynamoDB registry. This is the mocking boundary for tests."""

import base64
import json
import logging
import os
import time

import boto3
from aws_lambda_powertools.utilities.parameters import SSMProvider

logger = logging.getLogger(__name__)

SSM_PREFIX = '/ym-hackathon'
_TTL_SECONDS = 86400
# Athena caps get_query_results at 1000 rows per page.
_MAX_PAGE_ROWS = 1000

_ssm_endpoint = os.environ.get('SSM_ENDPOINT_URL')
ssm = SSMProvider(boto3_client=boto3.client('ssm', endpoint_url=_ssm_endpoint)) if _ssm_endpoint else SSMProvider()
athena = boto3.client('athena')
_dynamodb_endpoint = os.environ.get('DYNAMODB_ENDPOINT_URL') or None
table = boto3.resource('dynamodb', endpoint_url=_dynamodb_endpoint).Table(os.environ['QUERY_TABLE'])


def get_athena_config() -> dict:
    """Read Athena runtime config from SSM. SSMProvider's max_age handles caching."""
    return json.loads(ssm.get(f'{SSM_PREFIX}/athena-config', max_age=1800))


def _str_literal(value: str) -> str:
    """Render ``value`` as a single-quoted Athena string literal (quotes doubled).

    Athena treats each execution parameter as a SQL literal, so a bare ``9700006`` or
    ``2024-01-01`` is parsed as a number/expression, not a string, and mismatches the
    varchar column. Per the Athena docs, string parameters must be enclosed in single
    quotes; every bind in this API is a (pydantic-validated) string, so we quote them all.
    """
    return "'" + value.replace("'", "''") + "'"


def start_query(sql: str, params: list[str]) -> str:
    """Start ``sql`` on Athena, binding ``params`` positionally via ExecutionParameters.

    ExecutionParameters (``?``-binding) is what keeps user input out of the SQL text;
    the query returns immediately with an execution id (no in-Lambda polling).
    """
    cfg = get_athena_config()
    context = {'Database': cfg['database']}
    if cfg.get('catalog'):
        context['Catalog'] = cfg['catalog']

    kwargs = {
        'QueryString': sql,
        'QueryExecutionContext': context,
        'WorkGroup': cfg['workgroup'],
    }
    if params:
        kwargs['ExecutionParameters'] = [_str_literal(p) for p in params]
    return athena.start_query_execution(**kwargs)['QueryExecutionId']


def get_state(exec_id: str) -> tuple[str, str | None]:
    """Return ``(athena_state, output_location)`` for one execution."""
    query_execution = athena.get_query_execution(QueryExecutionId=exec_id)['QueryExecution']
    location = query_execution.get('ResultConfiguration', {}).get('OutputLocation')
    return query_execution['Status']['State'], location


def put_registry(query_id: str, exec_id: str, query_type: str) -> None:
    """Persist the query_id → exec_id mapping with a 24h TTL for auto-cleanup."""
    table.put_item(
        Item={
            'query_id': query_id,
            'exec_id': exec_id,
            'query_type': query_type,
            'status': 'PENDING',
            'ttl': int(time.time()) + _TTL_SECONDS,
        }
    )


def get_registry(query_id: str) -> dict | None:
    """Return the registry item for ``query_id``, or None if unknown/expired."""
    return table.get_item(Key={'query_id': query_id}).get('Item')


def set_status(query_id: str, status: str) -> None:
    """Update the cached status on the registry item (best-effort; ``status`` is reserved)."""
    table.update_item(
        Key={'query_id': query_id},
        UpdateExpression='SET #s = :s',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':s': status},
    )


def fetch_page(exec_id: str, page_token: str | None = None) -> dict:
    """Read one result page: ``{columns, rows, next_page_token?}``.

    ``page_token`` is the base64 of Athena's NextToken. The header row is only
    present (and thus only skipped) on the first page — i.e. when no token is given.
    """
    kwargs = {'QueryExecutionId': exec_id, 'MaxResults': _MAX_PAGE_ROWS}
    if page_token:
        kwargs['NextToken'] = _decode_token(page_token)
    result = athena.get_query_results(**kwargs)
    result_set = result['ResultSet']

    column_info = result_set.get('ResultSetMetadata', {}).get('ColumnInfo', [])
    columns = [c['Name'] for c in column_info]

    page_rows = result_set.get('Rows', [])
    # Athena repeats the column-name header as the first row of the first page only.
    if not page_token and page_rows:
        page_rows = page_rows[1:]
    rows = [[cell.get('VarCharValue') for cell in row.get('Data', [])] for row in page_rows]

    out = {'columns': columns, 'rows': rows}
    next_token = result.get('NextToken')
    if next_token:
        out['next_page_token'] = _encode_token(next_token)
    return out


def _encode_token(token: str) -> str:
    return base64.urlsafe_b64encode(token.encode()).decode()


def _decode_token(token: str) -> str:
    return base64.urlsafe_b64decode(token.encode()).decode()
