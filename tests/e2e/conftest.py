"""Fixtures for the live M5 async-query-API end-to-end tests.

Unlike the unit tests (which mock ``config``), these drive the *deployed* API Gateway
endpoint over HTTPS: submit → poll → page results. They therefore need AWS credentials
and a deployed ``YmHackathonAthenaToolStack`` whose data lake has been populated (M1/M2/M3 upload).

The whole suite is marked ``e2e`` and **auto-skips** when the stack, its M5 outputs, or
AWS credentials are unavailable — so a bare ``pytest`` stays green without AWS. Run it:

    AWS_PROFILE=rdc-sso pytest -s -m e2e tests/e2e/

Overridable via env: ``E2E_STACK_NAME`` (default ``YmHackathonAthenaToolStack``) and the standard
AWS region vars (default ``us-west-2``).
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest

STACK_NAME = os.environ.get('E2E_STACK_NAME', 'YmHackathonAthenaToolStack')
REGION = (
    os.environ.get('AWS_REGION')
    or os.environ.get('AWS_DEFAULT_REGION')
    or os.environ.get('CDK_DEFAULT_REGION')
    or 'us-west-2'
)

# YM WELLNESS — the star vessel with the engineered fouling arc; guarantees populated rows.
WELLNESS_IMO = '9700006'

_POLL_TIMEOUT_S = 120
_POLL_INTERVAL_S = 2
_HTTP_TIMEOUT_S = 30


class ApiClient:
    """Thin stdlib (``urllib``) HTTP client for the async query API.

    All methods return ``(status_code, parsed_json)`` and never raise on 4xx/5xx, so tests
    can assert on the status code directly.
    """

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url if base_url.endswith('/') else base_url + '/'
        self._key = api_key

    def _request(self, method: str, path: str, body: dict | None = None, *, api_key: bool = True):
        data = json.dumps(body).encode() if body is not None else None
        headers = {'content-type': 'application/json'}
        if api_key:
            headers['x-api-key'] = self._key
        req = urllib.request.Request(self.base_url + path.lstrip('/'), data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
                return resp.status, json.loads(resp.read() or b'null')
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, {'raw': raw.decode(errors='replace')}

    def submit(self, query_type: str, params: dict | None = None, *, api_key: bool = True):
        return self._request('POST', 'v1/queries', {'query_type': query_type, 'params': params or {}}, api_key=api_key)

    def status(self, query_id: str):
        return self._request('GET', f'v1/queries/{query_id}')

    def results(self, query_id: str, page_token: str | None = None):
        path = f'v1/queries/{query_id}/results'
        if page_token:
            path += '?page_token=' + urllib.parse.quote(page_token, safe='')
        return self._request('GET', path)

    def wait(self, query_id: str, timeout: int = _POLL_TIMEOUT_S) -> dict:
        """Poll status until a terminal state (SUCCEEDED/FAILED); return the status body."""
        deadline = time.monotonic() + timeout
        while True:
            code, body = self.status(query_id)
            assert code == 200, body
            if body['status'] in ('SUCCEEDED', 'FAILED'):
                return body
            if time.monotonic() > deadline:
                raise AssertionError(f'query {query_id} still {body["status"]} after {timeout}s')
            time.sleep(_POLL_INTERVAL_S)

    def run(self, query_type: str, params: dict | None = None) -> dict:
        """Full happy path: submit → wait for SUCCEEDED → first page of results."""
        code, body = self.submit(query_type, params)
        assert code == 202, body
        final = self.wait(body['query_id'])
        assert final['status'] == 'SUCCEEDED', final
        code, page = self.results(body['query_id'])
        assert code == 200, page
        return page


@pytest.fixture(scope='session')
def api_client() -> ApiClient:
    """Resolve the deployed API URL + key from the stack outputs (or skip if unavailable)."""
    boto3 = pytest.importorskip('boto3')
    from botocore.exceptions import BotoCoreError, ClientError

    try:
        cfn = boto3.client('cloudformation', region_name=REGION)
        stacks = cfn.describe_stacks(StackName=STACK_NAME)['Stacks']
        outputs = {o['OutputKey']: o['OutputValue'] for o in stacks[0].get('Outputs', [])}
    except (BotoCoreError, ClientError) as e:
        pytest.skip(f'{STACK_NAME} not reachable in {REGION} (no creds or not deployed): {e}')

    url, key_id = outputs.get('AsyncQueryApiUrl'), outputs.get('AsyncQueryApiKeyId')
    if not url or not key_id:
        pytest.skip(f'{STACK_NAME} is missing M5 outputs (AsyncQueryApiUrl/AsyncQueryApiKeyId) — deploy M5 first')

    try:
        key = boto3.client('apigateway', region_name=REGION).get_api_key(apiKey=key_id, includeValue=True)['value']
    except (BotoCoreError, ClientError) as e:
        pytest.skip(f'cannot resolve API key {key_id}: {e}')

    return ApiClient(url, key)
