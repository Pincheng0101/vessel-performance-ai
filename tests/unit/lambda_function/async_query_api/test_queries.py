import pytest
from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from queries import _EXTRAS, _TABLES, QUERY_TYPES, render

from ym_datalake.schema import ALL_TABLES

# The 3 derived types: the only hand-written column lists in queries.py. TestCatalogDrift
# checks each name here against the real catalog, which is the whole point of the guard.
DERIVED = ('fleet_positions', 'ship_speed_power', 'predict_targets')


class TestCatalogDrift:
    """The guard that would have caught the /v1 + /v2 rot: every column queries.py names
    must exist in ym_datalake.schema, the single source of truth for the Glue catalog."""

    def test_every_table_has_a_query_type(self):
        # 20 tables + 3 derived = 23 query types, and no table is left unreachable.
        assert set(_TABLES) == set(ALL_TABLES)
        assert len(QUERY_TYPES) == len(ALL_TABLES) + len(DERIVED) == 23

    @pytest.mark.parametrize('table', sorted(_TABLES))
    def test_spec_columns_exist(self, table):
        spec = _TABLES[table]
        columns = {name for name, _type in ALL_TABLES[table]}

        if spec.ship_col:
            assert spec.ship_col in columns
        if spec.day_col:
            assert spec.day_col in columns
        for key in spec.extras:
            assert _EXTRAS[key].column in columns
        for column in (c.strip() for c in spec.order_by.split(',')):
            assert column in columns, f'{table} ORDER BY names a column it does not have: {column}'

    @pytest.mark.parametrize(
        'table,needed',
        [
            # fleet_positions + ship_speed_power's measured leg
            (
                'fact_performance_daily',
                (
                    'ship_id',
                    'noon_utc',
                    'report_date',
                    'latitude',
                    'longitude',
                    'heading_deg',
                    'speed_loss_pct',
                    'cii_rating_imo',
                    'port_from',
                    'port_to',
                    'voyage',
                    'speed_corrected_kn',
                    'power_corrected_kw',
                    'days_since_cleaning',
                    'valid_flag',
                ),
            ),
            # ship_speed_power's reference leg
            ('dim_reference_curve', ('ship_id', 'speed_kn', 'shaft_power_kw')),
            # predict_targets
            ('noon_report', ('ship_id', 'noon_utc', 'predict_fuel_type')),
        ],
    )
    def test_derived_columns_exist(self, table, needed):
        columns = {name for name, _type in ALL_TABLES[table]}
        assert set(needed) <= columns


class TestTableQueries:
    def test_select_star_no_filter(self):
        # No params → a bare scan; the projection is SELECT * so it cannot drift.
        sql, binds = render('dim_port', {})
        assert sql == 'SELECT * FROM dim_port ORDER BY locode'
        assert binds == []

    def test_ship_filter(self):
        sql, binds = render('fact_performance_daily', {'ship_id': 'S1'})
        assert sql == 'SELECT * FROM fact_performance_daily WHERE ship_id = ? ORDER BY ship_id, noon_utc'
        assert binds == ['S1']

    def test_ship_id_optional(self):
        # Every table is small, so an unfiltered scan is allowed (and is how you get a roster).
        sql, binds = render('dim_vessel', {})
        assert 'WHERE' not in sql
        assert binds == []

    def test_day_range(self):
        sql, binds = render('noon_report', {'ship_id': 'S21', 'start_day': 100, 'end_day': 200})
        assert 'WHERE ship_id = ? AND noon_utc BETWEEN CAST(? AS integer) AND CAST(? AS integer)' in sql
        # Binds render as string literals, so the int column needs the CAST.
        assert binds == ['S21', '100', '200']

    def test_day_range_start_only(self):
        sql, binds = render('noon_report', {'start_day': 50})
        assert 'WHERE noon_utc >= CAST(? AS integer)' in sql
        assert binds == ['50']

    def test_day_range_end_only(self):
        sql, binds = render('maintenance_event', {'end_day': 500})
        assert 'WHERE event_day <= CAST(? AS integer)' in sql
        assert binds == ['500']

    def test_inverted_day_range_rejected(self):
        # An inverted BETWEEN matches nothing; a 400 beats a confusing empty 200.
        with pytest.raises(BadRequestError):
            render('noon_report', {'start_day': 200, 'end_day': 100})

    def test_single_day_range_allowed(self):
        # start == end is a legitimate one-day window, not an inversion.
        sql, binds = render('noon_report', {'start_day': 100, 'end_day': 100})
        assert 'BETWEEN CAST(? AS integer) AND CAST(? AS integer)' in sql
        assert binds == ['100', '100']

    @pytest.mark.parametrize(
        'query_type,day_col',
        [
            ('uwi', 'inspection_day'),
            ('fuel_price', 'day'),
            ('fact_voyage', 'depart_day'),
            ('fact_alert', 'opened_day'),
            ('fact_maintenance_recommendation', 'due_day'),
        ],
    )
    def test_each_table_filters_its_own_day_axis(self, query_type, day_col):
        sql, binds = render(query_type, {'start_day': 10})
        assert f'{day_col} >= CAST(? AS integer)' in sql
        assert binds == ['10']

    def test_agg_fleet_daily_always_binds_fleet_id(self):
        # 'ALL' is a real rollup row that COEXISTS with FL-W1/FL-W2, so the filter is
        # never optional — an unbound fleet_id would double-count the rollup.
        sql, binds = render('agg_fleet_daily', {})
        assert 'WHERE fleet_id = ?' in sql
        assert binds == ['ALL']

    def test_agg_fleet_daily_sub_fleet(self):
        sql, binds = render('agg_fleet_daily', {'fleet_id': 'FL-W2', 'start_day': 0, 'end_day': 30})
        assert 'WHERE fleet_id = ? AND noon_utc BETWEEN' in sql
        assert binds == ['FL-W2', '0', '30']

    def test_agg_fleet_daily_rejects_legacy_fleet_id(self):
        # The old pattern accepted FL-AE and rejected the real FL-W1/FL-W2.
        with pytest.raises(BadRequestError):
            render('agg_fleet_daily', {'fleet_id': 'FL-AE'})

    def test_fact_alert_filters(self):
        sql, binds = render('fact_alert', {'ship_id': 'S3', 'fleet_id': 'FL-W1', 'severity': 'high', 'status': 'open'})
        assert 'WHERE ship_id = ? AND fleet_id = ? AND severity = ? AND status = ?' in sql
        assert binds == ['S3', 'FL-W1', 'high', 'open']

    def test_fact_alert_rejects_all_fleet(self):
        # fact_alert has no 'ALL' rollup row, so accepting it would silently return nothing.
        with pytest.raises(BadRequestError):
            render('fact_alert', {'fleet_id': 'ALL'})

    def test_fact_anomaly_severity(self):
        sql, binds = render('fact_anomaly', {'ship_id': 'S5', 'severity': 'medium'})
        assert 'WHERE ship_id = ? AND severity = ?' in sql
        assert binds == ['S5', 'medium']

    def test_bad_severity_rejected(self):
        with pytest.raises(BadRequestError):
            render('fact_anomaly', {'severity': 'critical'})

    @pytest.mark.parametrize('bad', ['S0', 'S13', 'S24', '9700006', 's1'])
    def test_bad_ship_id_rejected(self, bad):
        with pytest.raises(BadRequestError):
            render('fact_performance_daily', {'ship_id': bad})

    def test_negative_day_rejected(self):
        with pytest.raises(BadRequestError):
            render('noon_report', {'start_day': -1})

    def test_calendar_date_is_not_filterable(self):
        # The relative-day axis is the only day filter; report_date comes back in SELECT *
        # but the old date params are gone.
        with pytest.raises(BadRequestError):
            render('fact_performance_daily', {'start_date': '2026-01-01'})

    def test_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('fact_recommendation', {'ship_id': 'S1', 'evil': "'; DROP TABLE x --"})

    def test_ship_param_rejected_on_shipless_table(self):
        # fuel_price is fleet-wide (no ship_id column), so the param must not be accepted.
        with pytest.raises(BadRequestError):
            render('fuel_price', {'ship_id': 'S1'})

    def test_unknown_query_type_raises(self):
        with pytest.raises(BadRequestError):
            render('vt_fd', {})

    @pytest.mark.parametrize('table', sorted(_TABLES))
    def test_every_table_renders(self, table):
        sql, _binds = render(table, {})
        assert sql.startswith(f'SELECT * FROM {table}')
        assert 'ORDER BY' in sql


class TestDerivedQueries:
    def test_fleet_positions_latest_row_per_ship(self):
        sql, binds = render('fleet_positions', {})
        assert 'FROM fact_performance_daily' in sql
        # noon_utc (not the synthesized calendar) is the real axis, so the window orders on it.
        # Two windows: one for the position, one for the speed loss — they land on different days.
        assert sql.count('row_number() OVER (PARTITION BY ship_id ORDER BY noon_utc DESC)') == 2
        assert 'WHERE p.rn = 1' in sql
        assert sql.rstrip().endswith('ORDER BY p.ship_id')
        assert binds == []

    def test_fleet_positions_gates_the_speed_loss_on_valid_flag(self):
        # The map colours its dots by this number. Taking it from the latest row REGARDLESS of
        # valid_flag painted 10 of 15 ships wrong — S4 green when it is 11.24 % critical, S6 red
        # when it is 2.43 % good, and the two worst-fouled hulls (S11, S12) grey. The speed loss
        # must come from the latest row that actually passed the ISO gate.
        sql, _binds = render('fleet_positions', {})
        assert 'WHERE valid_flag AND speed_loss_pct IS NOT NULL' in sql
        # LEFT JOIN: a ship with no valid day keeps its dot (grey), it does not fall off the map.
        assert 'LEFT JOIN' in sql
        # And the reading's age is carried out, so the UI can say how old it is.
        assert 'noon_utc AS speed_loss_day' in sql

    def test_fleet_positions_takes_no_params(self):
        with pytest.raises(BadRequestError):
            render('fleet_positions', {'ship_id': 'S1'})

    def test_ship_speed_power_union(self):
        sql, binds = render('ship_speed_power', {'ship_id': 'S9'})
        assert 'UNION ALL' in sql
        assert 'FROM fact_performance_daily WHERE ship_id = ? AND valid_flag' in sql
        assert 'FROM dim_reference_curve WHERE ship_id = ?' in sql
        assert sql.count('?') == 2
        assert binds == ['S9', 'S9']

    def test_ship_speed_power_requires_ship(self):
        with pytest.raises(BadRequestError):
            render('ship_speed_power', {})

    def test_predict_targets_all_ships(self):
        sql, binds = render('predict_targets', {})
        # The PREDICT cells survive only in raw noon_report.
        assert sql.startswith('SELECT * FROM noon_report WHERE predict_fuel_type IS NOT NULL')
        assert sql.rstrip().endswith('ORDER BY ship_id, noon_utc')
        assert binds == []

    def test_predict_targets_one_ship(self):
        sql, binds = render('predict_targets', {'ship_id': 'S22'})
        assert 'predict_fuel_type IS NOT NULL AND ship_id = ?' in sql
        assert binds == ['S22']


class TestLegacyTypesGone:
    @pytest.mark.parametrize(
        'query_type',
        ['fleet_overview', 'fleet_vessels', 'fleet_list', 'fleet_alerts', 'vessel_metrics', 'vessel_speed_loss'],
    )
    def test_v1_query_types_removed(self, query_type):
        # The /v1 names keyed on imo_number against tables that no longer exist.
        assert query_type not in QUERY_TYPES
        with pytest.raises(BadRequestError):
            render(query_type, {})

    def test_no_versioned_registry(self):
        import queries

        assert not hasattr(queries, 'QUERY_TYPES_V2')
