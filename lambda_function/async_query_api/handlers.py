"""Route logic and API schemas for the async query API: submit / status / results.

The Pydantic models below double as the request/response contract that Powertools
uses to validate payloads and to generate the OpenAPI schema served at /swagger.
"""

import logging
import uuid
from typing import Annotated, Literal, Union

import config
import queries
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, NotFoundError, ServiceError
from pydantic import BaseModel, ConfigDict, Field, create_model

logger = logging.getLogger(__name__)

# Athena execution state → API-facing status.
_STATE_MAP = {
    'QUEUED': 'PENDING',
    'RUNNING': 'RUNNING',
    'SUCCEEDED': 'SUCCEEDED',
    'FAILED': 'FAILED',
    'CANCELLED': 'FAILED',
}


def _submit_variant(query_type: str, params_model: type[BaseModel]) -> type[BaseModel]:
    """Build one request-body variant: a fixed query_type + its typed params model.

    params is optional when the model has no required fields (so callers can omit it
    for the no-parameter query types) and required otherwise.
    """
    required = any(f.is_required() for f in params_model.model_fields.values())
    params_field = (params_model, ... if required else Field(default_factory=params_model))
    return create_model(
        f'Submit_{query_type}',
        __config__=ConfigDict(extra='forbid', title=f'{query_type} query'),
        query_type=(Literal[query_type], ...),
        params=params_field,
    )


# Discriminated union over query_type: Swagger renders a dropdown and shows the exact
# params schema for the selected type. Built from the registry so it never drifts.
_SUBMIT_VARIANTS = tuple(_submit_variant(name, model) for name, (model, _builder) in queries.QUERY_TYPES.items())
SubmitBody = Annotated[Union[_SUBMIT_VARIANTS], Field(discriminator='query_type')]


class SubmitResponse(BaseModel):
    """202 response for an accepted query submission."""

    query_id: str = Field(description='Opaque id used to poll status and fetch results.')
    status: str = Field(description='Always PENDING immediately after submission.')


class StatusResponse(BaseModel):
    """Status of a previously submitted query."""

    query_id: str
    status: str = Field(description='One of PENDING / RUNNING / SUCCEEDED / FAILED.')
    result_location: str | None = Field(default=None, description='S3 URI of the result set once SUCCEEDED.')
    error: str | None = Field(default=None, description="Athena's reason for the failure, when FAILED.")


class ResultsResponse(BaseModel):
    """One page of query results."""

    query_id: str
    columns: list[str] = Field(description='Column names in row order.')
    rows: list[list[str | None]] = Field(description='Row values as strings; null for SQL NULL.')
    next_page_token: str | None = Field(default=None, description='Pass back as page_token to fetch the next page.')


def submit(req: SubmitBody) -> dict:
    """POST /queries — start the query, register it, return the query_id (202)."""
    sql, binds = queries.render(req.query_type, req.params.model_dump())
    exec_id = config.start_query(sql, binds)
    query_id = 'q_' + uuid.uuid4().hex
    config.put_registry(query_id, exec_id, req.query_type)
    logger.info('submitted query_id=%s exec_id=%s type=%s', query_id, exec_id, req.query_type)
    return {'query_id': query_id, 'status': 'PENDING'}


def status(query_id: str) -> dict:
    """GET /queries/{id} — map Athena state to API status; add result_location / error."""
    item = config.get_registry(query_id)
    if item is None:
        raise NotFoundError(f'Unknown query_id: {query_id}')

    state, location, reason = config.get_state(item['exec_id'])
    mapped = _STATE_MAP.get(state, 'PENDING')

    result = {'query_id': query_id, 'status': mapped}
    if mapped == 'SUCCEEDED' and location:
        result['result_location'] = location
    if mapped == 'FAILED':
        result['error'] = reason or f'Query {state.lower()} without a reason'
    return result


def results(query_id: str, page_token: str | None = None) -> dict:
    """GET /queries/{id}/results — page results inline.

    Still running → 409, retry. Terminally FAILED/CANCELLED → 400 with Athena's reason:
    it will never succeed, so telling the caller to keep polling would be an infinite loop.
    """
    item = config.get_registry(query_id)
    if item is None:
        raise NotFoundError(f'Unknown query_id: {query_id}')

    state, _, reason = config.get_state(item['exec_id'])
    mapped = _STATE_MAP.get(state, 'PENDING')
    if mapped == 'FAILED':
        raise BadRequestError(
            f'Query {query_id} {state.lower()} and has no results: {reason or "no reason reported by Athena"}'
        )
    if mapped != 'SUCCEEDED':
        raise ServiceError(
            409,
            f'Query {query_id} is not ready (status={mapped}); poll GET /queries/{query_id} until SUCCEEDED',
        )

    page = config.fetch_page(item['exec_id'], page_token)
    return {'query_id': query_id, **page}
