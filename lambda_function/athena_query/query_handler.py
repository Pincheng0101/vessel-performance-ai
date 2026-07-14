"""RunQueryTool handler — run arbitrary SQL against Athena."""

import logging

from config import get_athena_config, run_query
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


class RunQueryInput(BaseModel):
    model_config = ConfigDict(extra='ignore')

    sql: str
    # Bounded: 0 would return neither rows nor columns, and an unbounded value materializes
    # the whole result set into the 6MB sync-invoke response after the query has already run.
    max_rows: int = Field(default=1000, ge=1, le=10_000)
    # Optional per-request overrides; fall back to SSM config when omitted.
    database: str | None = None
    catalog: str | None = None


def handle(event: dict) -> dict:
    params = RunQueryInput.model_validate(event)
    cfg = get_athena_config()

    return run_query(
        params.sql,
        database=params.database if params.database is not None else cfg.get('database', ''),
        catalog=params.catalog if params.catalog is not None else cfg.get('catalog', 'AwsDataCatalog'),
        workgroup=cfg['workgroup'],
        max_rows=params.max_rows,
        action='run_query',
    )
