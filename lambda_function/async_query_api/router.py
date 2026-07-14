"""API Gateway entry point — Powertools REST resolver dispatching to handlers.

Serves interactive docs at /swagger and the raw OpenAPI schema at /openapi.json.
Both doc routes are public (no x-api-key) so a browser can open them directly; the
/v1 routes remain key-protected at the API Gateway layer.
"""

from typing import Annotated

import handlers
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.event_handler.openapi.models import Server
from aws_lambda_powertools.event_handler.openapi.params import Body, Query

_API_TITLE = 'YM Datalake Async Query API'
_API_VERSION = '1.0.0'
_API_DESCRIPTION = 'Submit Athena queries asynchronously, poll their status, and page through results.'
# The API is served under the 'prod' stage, so document that prefix; a relative url keeps
# it correct across accounts/regions and makes Swagger UI "Try it out" hit /prod/v1/*.
_SERVERS = [Server(url='/prod')]

# CORS allow-all for the browser Dashboard; Powertools adds the headers to real responses
# (API Gateway MOCK handles the OPTIONS preflight). enable_validation drives both request
# parsing and the OpenAPI schema generation that Swagger UI renders.
app = APIGatewayRestResolver(
    cors=CORSConfig(allow_origin='*', allow_headers=['x-api-key', 'content-type']),
    enable_validation=True,
)
app.enable_swagger(
    path='/swagger', title=_API_TITLE, version=_API_VERSION, description=_API_DESCRIPTION, servers=_SERVERS
)


@app.post('/v1/queries', status_code=202, summary='Submit a query', tags=['queries'])
def submit_query(body: Annotated[handlers.SubmitBody, Body()]) -> handlers.SubmitResponse:
    return handlers.submit(body)


@app.get('/v1/queries/<query_id>', summary='Get query status', tags=['queries'])
def get_status(query_id: str) -> handlers.StatusResponse:
    return handlers.status(query_id)


@app.get('/v1/queries/<query_id>/results', summary='Fetch query results', tags=['queries'])
def get_results(
    query_id: str,
    page_token: Annotated[str | None, Query(description='Token from a previous page.')] = None,
) -> handlers.ResultsResponse:
    return handlers.results(query_id, page_token)


@app.get('/openapi.json', summary='OpenAPI schema', tags=['docs'])
def openapi_schema() -> dict:
    import json

    return json.loads(
        app.get_openapi_json_schema(
            title=_API_TITLE, version=_API_VERSION, description=_API_DESCRIPTION, servers=_SERVERS
        )
    )


def lambda_handler(event, context):
    return app.resolve(event, context)
