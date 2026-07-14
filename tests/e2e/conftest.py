"""Fixtures for the live end-to-end tests: the M5 async-query API and the GenBI agent runtime.

Unlike the unit tests (which mock ``config``), these drive *deployed* endpoints over HTTPS —
the API Gateway (submit → poll → page results) and the Bedrock AgentCore runtime (Cognito token
→ ``POST /invocations`` → SSE). They therefore need AWS credentials, a deployed
``YmHackathonAthenaToolStack`` whose data lake has been populated (M1/M2/M3 upload), and — for the
agent — ``YmHackathonGenbiAgentAuthStack`` + ``YmHackathonGenbiAgentRuntimeStack``.

The whole suite is marked ``e2e`` and **auto-skips** when a stack, its outputs, or AWS credentials
are unavailable — so a bare ``pytest`` stays green without AWS. Run it:

    AWS_PROFILE=ym-hackathon pytest -s -m e2e tests/e2e/

Overridable via env: ``E2E_STACK_NAME`` (default ``YmHackathonAthenaToolStack``),
``E2E_AGENT_AUTH_STACK``, ``E2E_AGENT_RUNTIME_STACK``, and the standard AWS region vars
(default ``us-west-2``).
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

import pytest

STACK_NAME = os.environ.get('E2E_STACK_NAME', 'YmHackathonAthenaToolStack')
AGENT_AUTH_STACK = os.environ.get('E2E_AGENT_AUTH_STACK', 'YmHackathonGenbiAgentAuthStack')
AGENT_RUNTIME_STACK = os.environ.get('E2E_AGENT_RUNTIME_STACK', 'YmHackathonGenbiAgentRuntimeStack')
REGION = (
    os.environ.get('AWS_REGION')
    or os.environ.get('AWS_DEFAULT_REGION')
    or os.environ.get('CDK_DEFAULT_REGION')
    or 'us-west-2'
)

# S1 — a training ship, so every curated table carries rows for it. S21 is a *prediction*
# ship: it is the only place the PREDICT cells (and thus predict_targets rows) exist.
SHIP_ID = 'S1'
PREDICT_SHIP_ID = 'S21'

_POLL_TIMEOUT_S = 120
_POLL_INTERVAL_S = 2
_HTTP_TIMEOUT_S = 30
# One agent turn is an LLM loop with ≥2 tool calls (skill + Athena), so it is far slower than an API call.
_AGENT_TIMEOUT_S = 180


def _stack_outputs(cfn, name: str) -> dict:
    """CFN outputs of a stack as a flat {OutputKey: OutputValue} dict."""
    stacks = cfn.describe_stacks(StackName=name)['Stacks']
    return {o['OutputKey']: o['OutputValue'] for o in stacks[0].get('Outputs', [])}


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
        return self._request('POST', 'queries', {'query_type': query_type, 'params': params or {}}, api_key=api_key)

    def status(self, query_id: str):
        return self._request('GET', f'queries/{query_id}')

    def results(self, query_id: str, page_token: str | None = None):
        path = f'queries/{query_id}/results'
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
        outputs = _stack_outputs(cfn, STACK_NAME)
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


# --- GenBI agent (Bedrock AgentCore runtime) ---------------------------------------------------


def new_session_id() -> str:
    """A fresh runtime session id: ≥33 chars (runtime minimum) and greppable in CloudWatch."""
    return f'e2e-{uuid.uuid4().hex}'


def answer_text(frames: list) -> str:
    """The assistant's answer: every text-delta frame (a bare JSON string) concatenated."""
    return ''.join(f for f in frames if isinstance(f, str))


def tools_used(frames: list) -> set[str]:
    """Names of the tools the agent started during the turn."""
    return {f['tool'] for f in frames if isinstance(f, dict) and 'tool' in f}


def errors(frames: list) -> list[dict]:
    """Agent-level error frames, e.g. ``{'error': "Missing 'prompt' in payload."}``."""
    return [f for f in frames if isinstance(f, dict) and 'error' in f]


def _parse_sse(resp) -> list:
    """Parse an ``text/event-stream`` body into its decoded frames.

    Every frame the runtime emits is JSON-encoded by the SDK, so a text delta containing a
    newline arrives escaped — one ``data:`` line is always one complete JSON value.
    """
    frames = []
    for raw in resp:
        line = raw.decode('utf-8', errors='replace').rstrip('\r\n')
        if line.startswith('data: '):
            frames.append(json.loads(line[len('data: ') :]))
    return frames


class AgentClient:
    """Thin stdlib (``urllib``) SSE client for the deployed GenBI agent runtime.

    ``invoke`` returns ``(status_code, frames)`` and never raises on 4xx/5xx, so tests can
    assert on the status code directly.
    """

    def __init__(self, runtime_arn: str, token: str):
        arn = urllib.parse.quote(runtime_arn, safe='')
        self.url = f'https://bedrock-agentcore.{REGION}.amazonaws.com/runtimes/{arn}/invocations?qualifier=DEFAULT'
        self._token = token

    def invoke(self, payload: dict, *, session_id: str | None = None, auth: bool = True):
        """POST one payload; return (status_code, parsed SSE frames).

        Pass the same ``session_id`` across calls to keep conversation context (the runtime
        routes a session to the same microVM, where the agent holds the message history).
        """
        headers = {
            'content-type': 'application/json',
            'accept': 'text/event-stream',
            'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': session_id or new_session_id(),
        }
        if auth:
            headers['authorization'] = f'Bearer {self._token}'
        req = urllib.request.Request(self.url, data=json.dumps(payload).encode(), method='POST', headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=_AGENT_TIMEOUT_S) as resp:
                return resp.status, _parse_sse(resp)
        except urllib.error.HTTPError as e:
            return e.code, _parse_sse(e)


def _mint_token(token_endpoint: str, client_id: str, client_secret: str, scope: str) -> str:
    """Cognito M2M access token (client_credentials grant) — valid 24h, no user login."""
    form = urllib.parse.urlencode(
        {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': scope,
        }
    ).encode()
    req = urllib.request.Request(
        token_endpoint, data=form, method='POST', headers={'content-type': 'application/x-www-form-urlencoded'}
    )
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
        return json.loads(resp.read())['access_token']


@pytest.fixture(scope='session')
def agent_client() -> AgentClient:
    """Resolve the runtime ARN + a Cognito M2M token from the two agent stacks (or skip)."""
    boto3 = pytest.importorskip('boto3')
    from botocore.exceptions import BotoCoreError, ClientError

    try:
        cfn = boto3.client('cloudformation', region_name=REGION)
        auth = _stack_outputs(cfn, AGENT_AUTH_STACK)
        runtime = _stack_outputs(cfn, AGENT_RUNTIME_STACK)
    except (BotoCoreError, ClientError) as e:
        pytest.skip(f'agent stacks not reachable in {REGION} (no creds or not deployed): {e}')

    runtime_arn = runtime.get('RuntimeArn')
    if not runtime_arn:
        pytest.skip(f'{AGENT_RUNTIME_STACK} is missing the RuntimeArn output — deploy the agent first')

    pool_id, client_id = auth.get('UserPoolId'), auth.get('ClientId')
    token_endpoint, scope = auth.get('TokenEndpoint'), auth.get('TokenScope')
    if not (pool_id and client_id and token_endpoint and scope):
        pytest.skip(f'{AGENT_AUTH_STACK} is missing the Cognito outputs (UserPoolId/ClientId/TokenEndpoint/TokenScope)')

    # The client secret is deliberately not a CFN output — read it from Cognito itself.
    try:
        cognito = boto3.client('cognito-idp', region_name=REGION)
        described = cognito.describe_user_pool_client(UserPoolId=pool_id, ClientId=client_id)
        secret = described['UserPoolClient']['ClientSecret']
    except (BotoCoreError, ClientError, KeyError) as e:
        pytest.skip(f'cannot resolve the Cognito client secret for {client_id}: {e}')

    try:
        token = _mint_token(token_endpoint, client_id, secret, scope)
    except (urllib.error.URLError, ValueError, KeyError) as e:
        pytest.skip(f'cannot mint a Cognito token at {token_endpoint}: {e}')

    return AgentClient(runtime_arn, token)
