"""Live end-to-end tests for the async query API (submit → poll → page results).

These hit the deployed API Gateway endpoint and run real Athena queries against the
uploaded data lake, so they need AWS creds + a populated ``YmHackathonAthenaToolStack`` (they
auto-skip otherwise — see ``conftest.py``). The unit tests mock Athena and so cannot catch a
bad column or table name; **this suite is what proves the rendered SQL is actually valid**
against the 20-table catalog.
"""

import pytest

from .conftest import PREDICT_SHIP_ID, SHIP_ID

pytestmark = pytest.mark.e2e

# The 17 tables keyed on ship_id, plus the derived ship_speed_power.
SHIP_QUERY_TYPES = [
    'noon_report',
    'vessel_master',
    'maintenance_event',
    'reference_curve',
    'uwi',
    'fact_performance_daily',
    'fact_performance_indicator',
    'fact_uwi',
    'fact_maintenance_event',
    'dim_vessel',
    'dim_reference_curve',
    'fact_voyage',
    'fact_anomaly',
    'fact_alert',
    'fact_recommendation',
    'fact_maintenance_recommendation',
    'fact_speed_profile',
    'ship_speed_power',
]
# The types that take no ship_id (fleet-wide or fleet-derived).
FLEET_QUERY_TYPES = ['fuel_price', 'dim_port', 'agg_fleet_daily', 'fleet_positions']

# Types whose rows are guaranteed by construction for one training ship — every ship gets a
# reference curve, a daily series, voyages, a cleaning recommendation and a speed profile.
# The rest (inspections, events, anomalies, alerts, due maintenance) are *findings*: a given
# ship may legitimately have none, so those only get the SQL-validity + shape check above.
SHIP_TYPES_WITH_GUARANTEED_ROWS = [
    'noon_report',
    'vessel_master',
    'reference_curve',
    'fact_performance_daily',
    'dim_vessel',
    'dim_reference_curve',
    'fact_voyage',
    'fact_recommendation',
    'fact_speed_profile',
    'ship_speed_power',
]


def _assert_result_shape(page: dict) -> None:
    assert isinstance(page['columns'], list) and page['columns']
    assert isinstance(page['rows'], list)
    ncols = len(page['columns'])
    for row in page['rows']:
        assert len(row) == ncols
        # Athena returns every cell as a VarCharValue string (or null for a missing cell).
        assert all(cell is None or isinstance(cell, str) for cell in row)


class TestEveryQueryTypeIsValidSql:
    """A SUCCEEDED execution with named columns means Athena resolved every table and
    column the builder emitted — the check the mocked unit tests structurally cannot make."""

    @pytest.mark.parametrize('query_type', SHIP_QUERY_TYPES)
    def test_ship_query_succeeds(self, api_client, query_type):
        page = api_client.run(query_type, {'ship_id': SHIP_ID})
        _assert_result_shape(page)
        assert 'ship_id' in page['columns'] or query_type == 'ship_speed_power'

    @pytest.mark.parametrize('query_type', FLEET_QUERY_TYPES)
    def test_fleet_query_succeeds(self, api_client, query_type):
        page = api_client.run(query_type, {})
        _assert_result_shape(page)
        assert page['rows'], f'{query_type} returned no rows'

    @pytest.mark.parametrize('query_type', SHIP_TYPES_WITH_GUARANTEED_ROWS)
    def test_ship_query_returns_rows(self, api_client, query_type):
        page = api_client.run(query_type, {'ship_id': SHIP_ID})
        assert page['rows'], f'{query_type} returned no rows for {SHIP_ID}'


class TestHappyPath:
    def test_submit_returns_202_pending(self, api_client):
        code, body = api_client.submit('dim_port', {})
        assert code == 202, body
        assert body['status'] == 'PENDING'
        assert body['query_id'].startswith('q_')

    def test_day_range_filters(self, api_client):
        page = api_client.run('fact_performance_daily', {'ship_id': SHIP_ID, 'start_day': 10, 'end_day': 20})
        assert page['rows'], 'day-range fact_performance_daily returned no rows'
        days = [int(row[page['columns'].index('noon_utc')]) for row in page['rows']]
        assert all(10 <= d <= 20 for d in days), days

    def test_agg_fleet_daily_rollup_vs_sub_fleet(self, api_client):
        # 'ALL' is a rollup row that coexists with FL-W1/FL-W2, so a sub-fleet is never
        # bigger than the rollup on the same day.
        all_page = api_client.run('agg_fleet_daily', {'start_day': 100, 'end_day': 100})
        sub_page = api_client.run('agg_fleet_daily', {'fleet_id': 'FL-W1', 'start_day': 100, 'end_day': 100})
        assert all_page['rows'] and sub_page['rows'], 'agg_fleet_daily returned no rows on day 100'
        n_idx = all_page['columns'].index('n_vessels')
        assert int(sub_page['rows'][0][n_idx]) <= int(all_page['rows'][0][n_idx])

    def test_fleet_positions_one_row_per_ship(self, api_client):
        page = api_client.run('fleet_positions', {})
        _assert_result_shape(page)
        for col in ('ship_id', 'latitude', 'longitude', 'speed_loss_pct', 'cii_rating_aer'):
            assert col in page['columns']
        ships = [row[page['columns'].index('ship_id')] for row in page['rows']]
        assert len(ships) == len(set(ships)), 'fleet_positions must be one row per ship'

    def test_ship_speed_power_unions_both_series(self, api_client):
        page = api_client.run('ship_speed_power', {'ship_id': SHIP_ID})
        assert page['rows'], f'ship_speed_power returned no rows for {SHIP_ID}'
        series = {row[page['columns'].index('series')] for row in page['rows']}
        assert series == {'measured', 'reference'}, series

    def test_predict_targets_only_on_prediction_ships(self, api_client):
        # The PREDICT cells exist only for S21-S23, and only in raw noon_report.
        page = api_client.run('predict_targets', {'ship_id': PREDICT_SHIP_ID})
        assert page['rows'], f'predict_targets returned no rows for {PREDICT_SHIP_ID}'
        assert all(row[page['columns'].index('predict_fuel_type')] for row in page['rows'])

        train_page = api_client.run('predict_targets', {'ship_id': SHIP_ID})
        assert not train_page['rows'], f'{SHIP_ID} is a training ship and must have no PREDICT cells'

    def test_succeeded_status_exposes_result_location(self, api_client):
        code, body = api_client.submit('fact_recommendation', {'ship_id': SHIP_ID})
        assert code == 202, body
        final = api_client.wait(body['query_id'])
        assert final['status'] == 'SUCCEEDED', final
        assert final.get('result_location', '').startswith('s3://')


class TestPagination:
    def test_next_page_token_paginates(self, api_client):
        # One ship's noon series (~1,400 rows) exceeds the 1000-row Athena page cap.
        code, body = api_client.submit('noon_report', {'ship_id': SHIP_ID})
        assert code == 202, body
        assert api_client.wait(body['query_id'])['status'] == 'SUCCEEDED'

        code, page1 = api_client.results(body['query_id'])
        assert code == 200, page1
        token = page1.get('next_page_token')
        assert token, 'expected a next_page_token for a >1000-row result'

        code, page2 = api_client.results(body['query_id'], token)
        assert code == 200, page2
        assert page2['rows'], 'second page was empty'
        assert page1['columns'] == page2['columns']
        assert page1['rows'][0] != page2['rows'][0], 'second page repeated the first page'


class TestErrors:
    """A malformed body is rejected at the schema layer (422), not by the SQL builder.

    query_type is the discriminator of a typed union and each variant's params model is
    ``extra='forbid'`` + pattern-validated, so Powertools rejects the request *before*
    dispatch. ``queries.render`` still raises its own 400 for an unknown type / bad params,
    but that path is now only reachable by a direct caller — it is defense-in-depth.
    """

    def test_unknown_query_type_422(self, api_client):
        code, _ = api_client.submit('vt_fd', {})  # a table the ETL rewrite deleted
        assert code == 422

    def test_legacy_v1_query_type_422(self, api_client):
        code, _ = api_client.submit('vessel_metrics', {'imo_number': '9700006'})
        assert code == 422

    def test_bad_ship_id_422(self, api_client):
        code, _ = api_client.submit('fact_anomaly', {'ship_id': 'S99'})
        assert code == 422

    def test_extra_param_422(self, api_client):
        code, _ = api_client.submit('fact_recommendation', {'ship_id': SHIP_ID, 'evil': "'; DROP TABLE x --"})
        assert code == 422

    def test_unknown_query_id_404(self, api_client):
        code, _ = api_client.status('q_does_not_exist')
        assert code == 404

    def test_results_before_ready_409(self, api_client):
        # Fetch results immediately, before polling: either already done (200) or not-ready (409).
        code, body = api_client.submit('noon_report', {'ship_id': SHIP_ID})
        assert code == 202, body
        code, page = api_client.results(body['query_id'])
        assert code in (200, 409), page
        if code == 409:
            assert 'SUCCEEDED' in page.get('message', ''), page

    def test_missing_api_key_403(self, api_client):
        code, _ = api_client.submit('dim_port', {}, api_key=False)
        assert code == 403
