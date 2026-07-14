"""Allow-listed ``query_type`` → parameterized SQL over the ym_hackathon catalog.

One query type per table (20), plus 3 derived types whose SQL cannot be expressed as a
single filtered table scan. Each builder returns ``(sql, bind_values)`` where every user
value is an Athena ``?`` placeholder — the values never touch the SQL text. Pydantic
validates/normalizes the params first (defense-in-depth + clean 400s); unknown
types/params raise BadRequestError.

Two deliberate choices:

* **``SELECT *``.** This Lambda is bundled as its own CDK asset and cannot import
  ``ym_datalake.schema``, so any explicit column list would be a hand-copy that rots
  silently the next time the catalog moves. ``SELECT *`` cannot drift, every table is
  small (largest: ``noon_report``, 21,282 rows), and ``config.fetch_page`` returns column
  names from Athena's ResultSetMetadata, so clients still get a named schema. The derived
  types below are the only hand-written column lists — and the unit tests check them
  against ``ym_datalake.schema.ALL_TABLES``.
* **The relative-day axis is the only day filter.** ``noon_utc`` / ``event_day`` /
  ``inspection_day`` / ``day`` / ``depart_day`` / ``due_day`` / ``opened_day`` are the one
  axis every table shares. The synthesized calendar columns (``report_date``,
  ``event_date``, …) still come back in the projection; they are just not filterable.

Binds render as single-quoted string literals (``config._str_literal``, Athena's
requirement for string execution parameters), so integer columns need an explicit
``CAST(? AS integer)`` — see ``_day_range``.
"""

from collections import namedtuple

from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from pydantic import BaseModel, ConfigDict, Field, ValidationError, create_model

# Real-dataset ship id: S1-S12 (training) or S21-S23 (prediction).
_SHIP_PATTERN = r'^S([1-9]|1[0-2]|2[1-3])$'
# agg_fleet_daily carries an 'ALL' rollup row alongside the two real sub-fleets.
_FLEET_PATTERN = r'^(ALL|FL-W[12])$'
# fact_alert has no rollup row, so 'ALL' there would match nothing — sub-fleets only.
_SUB_FLEET_PATTERN = r'^FL-W[12]$'
_SEVERITY_PATTERN = r'^(low|medium|high)$'
_STATUS_PATTERN = r'^(open|closed)$'


class _NoParams(BaseModel):
    model_config = ConfigDict(extra='forbid')


class _ShipParams(BaseModel):
    """ship_id is required — the builder emits one query per ship."""

    model_config = ConfigDict(extra='forbid')

    ship_id: str = Field(pattern=_SHIP_PATTERN)


class _OptionalShipParams(BaseModel):
    model_config = ConfigDict(extra='forbid')

    ship_id: str | None = Field(default=None, pattern=_SHIP_PATTERN)


# An extra equality filter: the client-facing param, the column it filters, and its
# pydantic field. Applied only when the value is not None — so agg_fleet_daily's
# non-optional fleet_id ('ALL' by default) is *always* bound, which is what stops a query
# double-counting the rollup row against its two sub-fleets. The two fleet filters share
# the param name and differ only in their pattern (fact_alert has no 'ALL' row).
_Extra = namedtuple('_Extra', 'param column field')

_EXTRAS = {
    'rollup_fleet': _Extra('fleet_id', 'fleet_id', (str, Field(default='ALL', pattern=_FLEET_PATTERN))),
    'fleet': _Extra('fleet_id', 'fleet_id', (str | None, Field(default=None, pattern=_SUB_FLEET_PATTERN))),
    'severity': _Extra('severity', 'severity', (str | None, Field(default=None, pattern=_SEVERITY_PATTERN))),
    'status': _Extra('status', 'status', (str | None, Field(default=None, pattern=_STATUS_PATTERN))),
}

# One spec per catalog table. ship_col / day_col are None when the table has no such axis;
# `extras` names the additional equality filters (keys into _EXTRAS).
_Spec = namedtuple('_Spec', 'ship_col day_col order_by extras', defaults=((),))

_TABLES = {
    # --- raw (6) ---
    'noon_report': _Spec('ship_id', 'noon_utc', 'ship_id, noon_utc'),
    'vessel_master': _Spec('ship_id', None, 'ship_id'),
    'maintenance_event': _Spec('ship_id', 'event_day', 'ship_id, event_day'),
    'reference_curve': _Spec('ship_id', None, 'ship_id, speed_kn'),
    'uwi': _Spec('ship_id', 'inspection_day', 'ship_id, inspection_day'),
    'fuel_price': _Spec(None, 'day', 'day, fuel_type'),
    # --- curated (14) ---
    'fact_performance_daily': _Spec('ship_id', 'noon_utc', 'ship_id, noon_utc'),
    'fact_performance_indicator': _Spec('ship_id', None, 'ship_id, indicator'),
    'fact_uwi': _Spec('ship_id', 'inspection_day', 'ship_id, inspection_day'),
    'fact_maintenance_event': _Spec('ship_id', 'event_day', 'ship_id, event_day'),
    'dim_vessel': _Spec('ship_id', None, 'ship_id'),
    'dim_reference_curve': _Spec('ship_id', None, 'ship_id, speed_kn'),
    'dim_port': _Spec(None, None, 'locode'),
    'agg_fleet_daily': _Spec(None, 'noon_utc', 'fleet_id, noon_utc', ('rollup_fleet',)),
    'fact_voyage': _Spec('ship_id', 'depart_day', 'ship_id, depart_day'),
    'fact_anomaly': _Spec('ship_id', 'noon_utc', 'ship_id, noon_utc', ('severity',)),
    'fact_alert': _Spec('ship_id', 'opened_day', 'ship_id, opened_day', ('fleet', 'severity', 'status')),
    'fact_recommendation': _Spec('ship_id', None, 'ship_id'),
    'fact_maintenance_recommendation': _Spec('ship_id', 'due_day', 'ship_id, due_day'),
    'fact_speed_profile': _Spec('ship_id', None, 'ship_id, speed_kn'),
}


def _params_model(table: str, spec: _Spec) -> type[BaseModel]:
    """Build the pydantic params model this table's spec implies."""
    fields: dict = {}
    if spec.ship_col:
        fields['ship_id'] = (str | None, Field(default=None, pattern=_SHIP_PATTERN))
    if spec.day_col:
        fields['start_day'] = (int | None, Field(default=None, ge=0))
        fields['end_day'] = (int | None, Field(default=None, ge=0))
    for key in spec.extras:
        extra = _EXTRAS[key]
        fields[extra.param] = extra.field
    return create_model(f'Params_{table}', __config__=ConfigDict(extra='forbid'), **fields)


def _day_range(column: str, start: int | None, end: int | None) -> tuple[list[str], list[str]]:
    """Optional relative-day range clauses. Binds render as string literals, so the
    integer column comparison needs an explicit CAST on each placeholder."""
    if start is not None and end is not None:
        # An inverted BETWEEN matches nothing; a 400 beats a silently empty 200.
        if start > end:
            raise BadRequestError(f'start_day ({start}) must be <= end_day ({end})')
        return [f'{column} BETWEEN CAST(? AS integer) AND CAST(? AS integer)'], [str(start), str(end)]
    if start is not None:
        return [f'{column} >= CAST(? AS integer)'], [str(start)]
    if end is not None:
        return [f'{column} <= CAST(? AS integer)'], [str(end)]
    return [], []


def _table_builder(table: str, spec: _Spec):
    """One generic ``SELECT * FROM <table> WHERE …`` builder, closed over the spec."""

    def build(p: BaseModel) -> tuple[str, list[str]]:
        values = p.model_dump()
        clauses: list[str] = []
        binds: list[str] = []

        # Equality filters first, then the day range — binds are positional, so this order
        # is also the ? order.
        if spec.ship_col and values.get('ship_id') is not None:
            clauses.append(f'{spec.ship_col} = ?')
            binds.append(values['ship_id'])
        for key in spec.extras:
            extra = _EXTRAS[key]
            if values.get(extra.param) is not None:
                clauses.append(f'{extra.column} = ?')
                binds.append(values[extra.param])
        if spec.day_col:
            day_clauses, day_binds = _day_range(spec.day_col, values.get('start_day'), values.get('end_day'))
            clauses += day_clauses
            binds += day_binds

        sql = f'SELECT * FROM {table}'
        if clauses:
            sql += ' WHERE ' + ' AND '.join(clauses)
        return f'{sql} ORDER BY {spec.order_by}', binds

    return build


# --- Derived types: SQL that is not a single filtered table scan. -------------------
# These are the only hand-written column lists in this module; test_queries.py checks
# every name below against ym_datalake.schema.ALL_TABLES.

# Latest daily row per ship, for the fleet map (one dot each).
_POSITION_COLUMNS = (
    'ship_id, noon_utc, report_date, latitude, longitude, heading_deg, speed_loss_pct, '
    'cii_rating_imo, port_from, port_to, voyage'
)


def _fleet_positions(p: _NoParams) -> tuple[str, list[str]]:
    return (
        f'SELECT {_POSITION_COLUMNS} FROM ('
        f'SELECT {_POSITION_COLUMNS}, '
        'row_number() OVER (PARTITION BY ship_id ORDER BY noon_utc DESC) AS rn '
        'FROM fact_performance_daily) WHERE rn = 1 ORDER BY ship_id',
        [],
    )


def _ship_speed_power(p: _ShipParams) -> tuple[str, list[str]]:
    # One ship's measured (ISO-corrected, valid-gated) points against its clean-hull
    # reference curve, aligned to (series, speed_kn, power_kw, days_since_cleaning).
    return (
        "SELECT 'measured' AS series, speed_corrected_kn AS speed_kn, "
        'power_corrected_kw AS power_kw, days_since_cleaning '
        'FROM fact_performance_daily WHERE ship_id = ? AND valid_flag '
        'UNION ALL '
        "SELECT 'reference' AS series, speed_kn, shaft_power_kw AS power_kw, "
        'CAST(NULL AS integer) AS days_since_cleaning '
        'FROM dim_reference_curve WHERE ship_id = ? '
        'ORDER BY series, speed_kn',
        [p.ship_id, p.ship_id],
    )


def _predict_targets(p: _OptionalShipParams) -> tuple[str, list[str]]:
    # The hackathon PREDICT cells: they exist only in raw noon_report (the curated zone
    # has no such marker), so this cannot be a plain noon_report filter.
    sql = 'SELECT * FROM noon_report WHERE predict_fuel_type IS NOT NULL'
    binds: list[str] = []
    if p.ship_id is not None:
        sql += ' AND ship_id = ?'
        binds.append(p.ship_id)
    return sql + ' ORDER BY ship_id, noon_utc', binds


# query_type → (pydantic param model, SQL builder). One flat namespace: 20 tables + 3 derived.
QUERY_TYPES = {table: (_params_model(table, spec), _table_builder(table, spec)) for table, spec in _TABLES.items()} | {
    'fleet_positions': (_NoParams, _fleet_positions),
    'ship_speed_power': (_ShipParams, _ship_speed_power),
    'predict_targets': (_OptionalShipParams, _predict_targets),
}


def render(query_type: str, params: dict) -> tuple[str, list[str]]:
    """Validate ``params`` and return ``(sql, bind_values)`` for ``query_type``.

    Raises BadRequestError for an unknown type or invalid params (→ HTTP 400).
    """
    entry = QUERY_TYPES.get(query_type)
    if entry is None:
        raise BadRequestError(f'Unknown query_type {query_type!r}. Allowed: {sorted(QUERY_TYPES)}')
    model_cls, builder = entry
    try:
        validated = model_cls.model_validate(params or {})
    except ValidationError as e:
        raise BadRequestError(f'Invalid params for {query_type}: {e.errors(include_url=False)}')
    return builder(validated)
