"""Live end-to-end tests for the M5 async query API (submit → poll → page results).

These hit the deployed API Gateway endpoint and run real Athena queries against the
uploaded data lake, so they need AWS creds + a populated ``YmHackathonAthenaToolStack`` (they
auto-skip otherwise — see ``conftest.py``). The strong SQL/handler assertions live in the
unit tests; here we verify the wire contract of the real deployment.
"""

import pytest

from .conftest import WELLNESS_IMO

pytestmark = pytest.mark.e2e

# Every vessel_* query_type keys off imo_number and returns rows for YM WELLNESS.
VESSEL_QUERY_TYPES = [
    'vessel_speed_loss',
    'vessel_speed_power',
    'vessel_anomalies',
    'vessel_alerts',
    'vessel_maintenance_effect',
    'vessel_recommendation',
    'vessel_track',
    'vessel_voyages',
    'vessel_speed_profile',
]


def _assert_result_shape(page: dict) -> None:
    assert isinstance(page['columns'], list) and page['columns']
    assert isinstance(page['rows'], list)
    ncols = len(page['columns'])
    for row in page['rows']:
        assert len(row) == ncols
        # Athena returns every cell as a VarCharValue string (or null for a missing cell).
        assert all(cell is None or isinstance(cell, str) for cell in row)


class TestHappyPath:
    def test_submit_returns_202_pending(self, api_client):
        code, body = api_client.submit('fleet_overview', {})
        assert code == 202, body
        assert body['status'] == 'PENDING'
        assert body['query_id'].startswith('q_')

    def test_fleet_overview_returns_rows(self, api_client):
        page = api_client.run('fleet_overview', {})
        assert 'report_date' in page['columns']
        assert page['rows'], 'fleet_overview returned no rows'
        _assert_result_shape(page)

    def test_fleet_overview_date_range_filters(self, api_client):
        page = api_client.run('fleet_overview', {'start_date': '2024-01-01', 'end_date': '2024-01-07'})
        assert page['rows'], 'date-range fleet_overview returned no rows'
        dates = [row[page['columns'].index('report_date')] for row in page['rows']]
        assert all('2024-01-01' <= d <= '2024-01-07' for d in dates), dates

    def test_fleet_overview_fleet_scope(self, api_client):
        # A sub-fleet is smaller than the whole fleet on any given day.
        all_page = api_client.run('fleet_overview', {'start_date': '2024-01-01', 'end_date': '2024-01-01'})
        sub_page = api_client.run(
            'fleet_overview', {'fleet_id': 'FL-AE', 'start_date': '2024-01-01', 'end_date': '2024-01-01'}
        )
        assert sub_page['rows'], 'FL-AE fleet_overview returned no rows'
        n_idx = all_page['columns'].index('n_vessels')
        assert int(sub_page['rows'][0][n_idx]) <= int(all_page['rows'][0][n_idx])

    def test_fleet_list_returns_fleets(self, api_client):
        page = api_client.run('fleet_list', {})
        assert page['rows'], 'fleet_list returned no rows'
        assert 'fleet_id' in page['columns'] and 'fleet_name' in page['columns']

    def test_fleet_alerts_returns_open_episodes(self, api_client):
        page = api_client.run('fleet_alerts', {})
        assert page['rows'], 'fleet_alerts returned no open episodes'
        _assert_result_shape(page)
        causes = {row[page['columns'].index('cause')] for row in page['rows']}
        assert 'hull_biofouling' in causes, 'expected a biofouling trend alert in the fleet feed'

    @pytest.mark.parametrize('query_type', VESSEL_QUERY_TYPES)
    def test_vessel_query_returns_rows(self, api_client, query_type):
        page = api_client.run(query_type, {'imo_number': WELLNESS_IMO})
        assert page['rows'], f'{query_type} returned no rows for {WELLNESS_IMO}'
        _assert_result_shape(page)

    def test_vessel_metrics_weather_attribution(self, api_client):
        # Phase 4: vessel_metrics surfaces the 3 additive excess-cost channels.
        page = api_client.run('vessel_metrics', {'imo_number': WELLNESS_IMO})
        assert page['rows'], f'vessel_metrics returned no rows for {WELLNESS_IMO}'
        _assert_result_shape(page)
        cols = ('excess_cost_usd', 'excess_cost_fouling_usd', 'excess_cost_weather_usd', 'excess_cost_operational_usd')
        for col in cols:
            assert col in page['columns'], f'{col} missing from vessel_metrics'
        idx = {c: page['columns'].index(c) for c in cols}
        checked = 0
        for row in page['rows']:
            if row[idx['excess_cost_fouling_usd']] is None:
                continue  # in-port day: channels co-null with excess_cost_usd
            base = float(row[idx['excess_cost_usd']])
            fouling = float(row[idx['excess_cost_fouling_usd']])
            weather = float(row[idx['excess_cost_weather_usd']])
            operational = float(row[idx['excess_cost_operational_usd']])
            assert abs(fouling - base) <= 1e-6 * max(1.0, abs(base))  # fouling == ISO headline
            assert weather >= -1e-9 and operational >= -1e-9  # additive, non-negative
            checked += 1
        assert checked, 'expected at-sea priced rows carrying the attribution split'

    def test_fleet_positions_one_row_per_vessel(self, api_client):
        # First window query: the latest daily row per vessel (one dot each on the map).
        page = api_client.run('fleet_positions', {})
        assert page['rows'], 'fleet_positions returned no rows'
        _assert_result_shape(page)
        for col in ('imo_number', 'latitude', 'longitude', 'speed_loss_pct', 'cii_rating_aer'):
            assert col in page['columns']
        imos = [row[page['columns'].index('imo_number')] for row in page['rows']]
        assert len(imos) == len(set(imos)), 'fleet_positions must be one row per vessel'

    def test_fleet_maintenance_recommendation_backlog(self, api_client):
        # Phase 6: fleet-wide maintenance backlog for the Planner, with query-time est_cost_usd.
        page = api_client.run('fleet_maintenance_recommendation', {})
        assert page['rows'], 'fleet_maintenance_recommendation returned no rows'
        _assert_result_shape(page)
        for col in ('imo_number', 'action_type', 'plan_date', 'est_cost_usd'):
            assert col in page['columns'], f'{col} missing from fleet_maintenance_recommendation'

    def test_succeeded_status_exposes_result_location(self, api_client):
        code, body = api_client.submit('vessel_recommendation', {'imo_number': WELLNESS_IMO})
        assert code == 202, body
        final = api_client.wait(body['query_id'])
        assert final['status'] == 'SUCCEEDED', final
        assert final.get('result_location', '').startswith('s3://')


class TestPagination:
    def test_next_page_token_paginates(self, api_client):
        # The full 5-year speed-loss series exceeds the 1000-row Athena page cap.
        code, body = api_client.submit('vessel_speed_loss', {'imo_number': WELLNESS_IMO})
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
    def test_unknown_query_type_400(self, api_client):
        code, _ = api_client.submit('vessel_report', {})  # deferred per poc-spec §5.6
        assert code == 400

    def test_bad_imo_number_400(self, api_client):
        code, _ = api_client.submit('vessel_anomalies', {'imo_number': '123'})
        assert code == 400

    def test_extra_param_400(self, api_client):
        code, _ = api_client.submit('vessel_recommendation', {'imo_number': WELLNESS_IMO, 'evil': "'; DROP TABLE x --"})
        assert code == 400

    def test_unknown_query_id_404(self, api_client):
        code, _ = api_client.status('q_does_not_exist')
        assert code == 404

    def test_results_before_ready_409(self, api_client):
        # Fetch results immediately, before polling: either already done (200) or not-ready (409).
        code, body = api_client.submit('vessel_speed_loss', {'imo_number': WELLNESS_IMO})
        assert code == 202, body
        code, page = api_client.results(body['query_id'])
        assert code in (200, 409), page
        if code == 409:
            assert 'SUCCEEDED' in page.get('message', ''), page

    def test_missing_api_key_403(self, api_client):
        code, _ = api_client.submit('fleet_overview', {}, api_key=False)
        assert code == 403
