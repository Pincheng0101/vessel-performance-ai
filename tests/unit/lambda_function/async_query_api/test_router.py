import json
from unittest.mock import patch

from queries import QUERY_TYPES
from router import lambda_handler


def _proxy_event(method, path, body=None, qs=None):
    """Minimal API Gateway REST proxy event (v1 / multiValueHeaders shape)."""
    return {
        'httpMethod': method,
        'path': path,
        'headers': {'Origin': 'http://localhost', 'Content-Type': 'application/json'},
        'requestContext': {'stage': 'prod', 'httpMethod': method, 'path': path},
        'queryStringParameters': qs,
        'multiValueQueryStringParameters': {k: [v] for k, v in (qs or {}).items()} or None,
        'body': json.dumps(body) if body is not None else None,
        'isBase64Encoded': False,
    }


class TestRouter:
    @patch('handlers.submit')
    def test_post_queries_dispatches_and_returns_202(self, submit_mock):
        submit_mock.return_value = {'query_id': 'q_1', 'status': 'PENDING'}
        event = _proxy_event('POST', '/queries', {'query_type': 'agg_fleet_daily', 'params': {}})
        resp = lambda_handler(event, None)
        assert resp['statusCode'] == 202
        # Powertools parses the JSON body into the matching typed variant before dispatch.
        (body_arg,) = submit_mock.call_args.args
        assert body_arg.query_type == 'agg_fleet_daily'
        assert body_arg.params.fleet_id == 'ALL'  # default filled by the typed params model
        assert json.loads(resp['body']) == {'query_id': 'q_1', 'status': 'PENDING'}

    @patch('handlers.submit')
    def test_post_queries_parses_ship_params(self, submit_mock):
        submit_mock.return_value = {'query_id': 'q_2', 'status': 'PENDING'}
        event = _proxy_event('POST', '/queries', {'query_type': 'fact_performance_daily', 'params': {'ship_id': 'S21'}})
        resp = lambda_handler(event, None)
        assert resp['statusCode'] == 202
        (body_arg,) = submit_mock.call_args.args
        assert body_arg.params.ship_id == 'S21'

    def test_missing_query_type_returns_422(self):
        # query_type is required by SubmitBody, so validation rejects the body before dispatch.
        resp = lambda_handler(_proxy_event('POST', '/queries', {'params': {}}), None)
        assert resp['statusCode'] == 422

    def test_unknown_query_type_returns_422(self):
        # query_type is a fixed enum, so an off-list value is rejected before dispatch.
        resp = lambda_handler(_proxy_event('POST', '/queries', {'query_type': 'nope'}), None)
        assert resp['statusCode'] == 422

    def test_legacy_query_type_returns_422(self):
        # The deleted /v1 names are not in the union any more.
        resp = lambda_handler(_proxy_event('POST', '/queries', {'query_type': 'vessel_metrics'}), None)
        assert resp['statusCode'] == 422

    def test_legacy_v1_path_returns_404(self):
        resp = lambda_handler(_proxy_event('POST', '/v1/queries', {'query_type': 'dim_port'}), None)
        assert resp['statusCode'] == 404

    def test_legacy_v2_path_returns_404(self):
        resp = lambda_handler(_proxy_event('POST', '/v2/queries', {'query_type': 'dim_port'}), None)
        assert resp['statusCode'] == 404

    @patch('handlers.status')
    def test_get_status_dispatches(self, status_mock):
        status_mock.return_value = {'query_id': 'q_1', 'status': 'RUNNING'}
        resp = lambda_handler(_proxy_event('GET', '/queries/q_1'), None)
        assert resp['statusCode'] == 200
        status_mock.assert_called_once_with('q_1')

    @patch('handlers.results')
    def test_get_results_passes_page_token(self, results_mock):
        results_mock.return_value = {'query_id': 'q_1', 'columns': [], 'rows': []}
        resp = lambda_handler(_proxy_event('GET', '/queries/q_1/results', qs={'page_token': 'tok'}), None)
        assert resp['statusCode'] == 200
        results_mock.assert_called_once_with('q_1', 'tok')

    @patch('handlers.results')
    def test_get_results_without_page_token(self, results_mock):
        results_mock.return_value = {'query_id': 'q_1', 'columns': [], 'rows': []}
        lambda_handler(_proxy_event('GET', '/queries/q_1/results'), None)
        results_mock.assert_called_once_with('q_1', None)

    @patch('handlers.status')
    def test_cors_header_present(self, status_mock):
        status_mock.return_value = {'query_id': 'q_1', 'status': 'RUNNING'}
        resp = lambda_handler(_proxy_event('GET', '/queries/q_1'), None)
        assert resp['multiValueHeaders']['Access-Control-Allow-Origin'] == ['*']

    def test_unknown_path_returns_404(self):
        resp = lambda_handler(_proxy_event('GET', '/nope'), None)
        assert resp['statusCode'] == 404

    def test_swagger_ui_served(self):
        resp = lambda_handler(_proxy_event('GET', '/swagger'), None)
        assert resp['statusCode'] == 200
        assert resp['multiValueHeaders']['Content-Type'] == ['text/html']

    def test_openapi_documents_per_type_params(self):
        resp = lambda_handler(_proxy_event('GET', '/openapi.json'), None)
        assert resp['statusCode'] == 200
        spec = json.loads(resp['body'])
        # One unversioned namespace — no /v1, no /v2.
        assert '/queries' in spec['paths']
        assert '/v1/queries' not in spec['paths'] and '/v2/queries' not in spec['paths']
        # The body is a query_type-discriminated union: one typed variant per query type.
        body_schema = spec['paths']['/queries']['post']['requestBody']['content']['application/json']['schema']
        assert body_schema['discriminator']['propertyName'] == 'query_type'
        assert len(body_schema['discriminator']['mapping']) == len(QUERY_TYPES)
        assert len(body_schema['oneOf']) == len(QUERY_TYPES) == 23
        # Per-type params are typed, so ship_id is documented and imo_number is gone.
        schemas = json.dumps(spec['components']['schemas'])
        assert 'ship_id' in schemas
        assert 'imo_number' not in schemas
        # The server prefix carries the stage so Swagger "Try it out" targets /prod/queries.
        assert spec['servers'] == [{'url': '/prod'}]
