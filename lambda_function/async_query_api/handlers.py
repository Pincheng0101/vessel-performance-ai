"""Route logic and API schemas for the async query API: submit / status / results.

The Pydantic models below double as the request/response contract that Powertools
uses to validate payloads and to generate the OpenAPI schema served at /swagger.
"""

import logging
import uuid
from typing import Annotated, Literal, Union

import config
import queries
from aws_lambda_powertools.event_handler.exceptions import NotFoundError, ServiceError
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


def _submit_variant(query_type: str, params_model: type[BaseModel], *, prefix: str = 'Submit') -> type[BaseModel]:
    """Build one request-body variant: a fixed query_type + its typed params model.

    params is optional when the model has no required fields (so callers can omit it
    for the no-parameter query types) and required otherwise. ``prefix`` keeps the
    generated model names unique across the v1/v2 unions (shared OpenAPI components).
    """
    required = any(f.is_required() for f in params_model.model_fields.values())
    params_field = (params_model, ... if required else Field(default_factory=params_model))
    return create_model(
        f'{prefix}_{query_type}',
        __config__=ConfigDict(extra='forbid', title=f'{query_type} query'),
        query_type=(Literal[query_type], ...),
        params=params_field,
    )


# Discriminated union over query_type: Swagger renders a dropdown and shows the exact
# params schema for the selected type. Built from the registry so it never drifts.
_SUBMIT_VARIANTS = tuple(_submit_variant(name, model) for name, (model, _builder) in queries.QUERY_TYPES.items())
SubmitBody = Annotated[Union[_SUBMIT_VARIANTS], Field(discriminator='query_type')]

_SUBMIT_VARIANTS_V2 = tuple(
    _submit_variant(name, model, prefix='SubmitV2') for name, (model, _builder) in queries.QUERY_TYPES_V2.items()
)
SubmitBodyV2 = Annotated[Union[_SUBMIT_VARIANTS_V2], Field(discriminator='query_type')]


class SubmitResponse(BaseModel):
    """202 response for an accepted query submission."""

    query_id: str = Field(description='Opaque id used to poll status and fetch results.')
    status: str = Field(description='Always PENDING immediately after submission.')


class StatusResponse(BaseModel):
    """Status of a previously submitted query."""

    query_id: str
    status: str = Field(description='One of PENDING / RUNNING / SUCCEEDED / FAILED.')
    result_location: str | None = Field(default=None, description='S3 URI of the result set once SUCCEEDED.')


class ResultsResponse(BaseModel):
    """One page of query results."""

    query_id: str
    columns: list[str] = Field(description='Column names in row order.')
    rows: list[list[str | None]] = Field(description='Row values as strings; null for SQL NULL.')
    next_page_token: str | None = Field(default=None, description='Pass back as page_token to fetch the next page.')


def submit(req: SubmitBody) -> dict:
    """POST /v1/queries — start the query, register it, return the query_id (202)."""
    return _submit(req, types=None)


def submit_v2(req: SubmitBodyV2) -> dict:
    """POST /v2/queries — same lifecycle, rendered against the real-dataset catalog."""
    return _submit(req, types=queries.QUERY_TYPES_V2)


def _submit(req, types: dict | None) -> dict:
    sql, binds = queries.render(req.query_type, req.params.model_dump(), types)
    exec_id = config.start_query(sql, binds)
    query_id = 'q_' + uuid.uuid4().hex
    config.put_registry(query_id, exec_id, req.query_type)
    logger.info('submitted query_id=%s exec_id=%s type=%s', query_id, exec_id, req.query_type)
    return {'query_id': query_id, 'status': 'PENDING'}


def status(query_id: str) -> dict:
    """GET /v1/queries/{id} — map Athena state to API status; add result_location when done."""
    item = config.get_registry(query_id)
    if item is None:
        raise NotFoundError(f'Unknown query_id: {query_id}')

    state, location = config.get_state(item['exec_id'])
    mapped = _STATE_MAP.get(state, 'PENDING')
    _best_effort_set_status(query_id, mapped)

    result = {'query_id': query_id, 'status': mapped}
    if mapped == 'SUCCEEDED' and location:
        result['result_location'] = location
    return result


def results(query_id: str, page_token: str | None = None) -> dict:
    """GET /v1/queries/{id}/results — page results inline; 409 until the query has SUCCEEDED."""
    item = config.get_registry(query_id)
    if item is None:
        raise NotFoundError(f'Unknown query_id: {query_id}')

    state, _ = config.get_state(item['exec_id'])
    if _STATE_MAP.get(state) != 'SUCCEEDED':
        raise ServiceError(
            409,
            f'Query {query_id} is not ready (status={_STATE_MAP.get(state, state)}); '
            f'poll GET /v1/queries/{query_id} until SUCCEEDED',
        )

    page = config.fetch_page(item['exec_id'], page_token)
    return {'query_id': query_id, **page}


def _best_effort_set_status(query_id: str, status: str) -> None:
    """The registry status is just a cache — never fail the request if the write fails."""
    try:
        config.set_status(query_id, status)
    except Exception:  # noqa: BLE001
        logger.warning('failed to update registry status for %s', query_id, exc_info=True)
