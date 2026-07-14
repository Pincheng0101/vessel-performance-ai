from unittest.mock import patch

import config
import pytest
from aws_lambda_powertools.event_handler.exceptions import NotFoundError, ServiceError
from handlers import SubmitBody, results, status, submit
from pydantic import TypeAdapter, ValidationError

from .conftest import (
    GET_QUERY_RESULTS_RESPONSE,
    REGISTRY_ITEM,
    SSM_ATHENA_CONFIG_JSON,
    get_query_execution_response,
)

# SubmitBody is a discriminated union, so parse dicts through an adapter the way Powertools does.
_body = TypeAdapter(SubmitBody).validate_python


@patch('config.table')
@patch('config.athena')
@patch('config.ssm')
class TestSubmit:
    def test_returns_query_id_and_pending(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        out = submit(_body({'query_type': 'vessel_recommendation', 'params': {'imo_number': '9700006'}}))
        assert out['status'] == 'PENDING'
        assert out['query_id'].startswith('q_')

    def test_execution_parameters_bind_values(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        submit(_body({'query_type': 'vessel_recommendation', 'params': {'imo_number': '9700006'}}))
        kwargs = athena_mock.start_query_execution.call_args[1]
        # Athena requires string execution parameters to be single-quoted literals.
        assert kwargs['ExecutionParameters'] == ["'9700006'"]
        assert kwargs['WorkGroup'] == 'ym-hackathon'
        assert kwargs['QueryExecutionContext'] == {'Database': 'test_db', 'Catalog': 'AwsDataCatalog'}

    def test_no_execution_parameters_when_no_binds(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        # fleet_vessels takes no params → no execution parameters (fleet_overview now binds fleet_id).
        submit(_body({'query_type': 'fleet_vessels', 'params': {}}))
        assert 'ExecutionParameters' not in athena_mock.start_query_execution.call_args[1]

    def test_registry_written_with_exec_id_type_ttl(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        out = submit(_body({'query_type': 'vessel_recommendation', 'params': {'imo_number': '9700006'}}))
        item = table_mock.put_item.call_args[1]['Item']
        assert item['query_id'] == out['query_id']
        assert item['exec_id'] == 'exec-abc'
        assert item['query_type'] == 'vessel_recommendation'
        assert isinstance(item['ttl'], int)

    def test_unknown_query_type_rejected_by_model(self, ssm_mock, athena_mock, table_mock):
        # query_type is the union discriminator, so an unknown value fails validation up front.
        with pytest.raises(ValidationError):
            _body({'query_type': 'nope', 'params': {}})

    def test_wrong_params_for_type_rejected(self, ssm_mock, athena_mock, table_mock):
        # vessel_recommendation requires params.imo_number; omitting it fails the typed variant.
        with pytest.raises(ValidationError):
            _body({'query_type': 'vessel_recommendation', 'params': {}})


class TestStrLiteral:
    def test_wraps_value_in_single_quotes(self):
        # Athena parses a bare 9700006 as an integer; the quotes make it a varchar literal.
        assert config._str_literal('9700006') == "'9700006'"
        assert config._str_literal('2024-01-01') == "'2024-01-01'"

    def test_doubles_embedded_single_quotes(self):
        # Defense-in-depth: even though pydantic forbids quotes, escaping stays injection-safe.
        assert config._str_literal("a'b") == "'a''b'"
        assert config._str_literal("'; DROP TABLE x --") == "'''; DROP TABLE x --'"


@patch('config.table')
@patch('config.athena')
class TestStatus:
    @pytest.mark.parametrize(
        'athena_state,expected',
        [
            ('QUEUED', 'PENDING'),
            ('RUNNING', 'RUNNING'),
            ('SUCCEEDED', 'SUCCEEDED'),
            ('FAILED', 'FAILED'),
            ('CANCELLED', 'FAILED'),
        ],
    )
    def test_state_mapping(self, athena_mock, table_mock, athena_state, expected):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response(athena_state)
        out = status('q_test')
        assert out['query_id'] == 'q_test'
        assert out['status'] == expected

    def test_succeeded_includes_result_location(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        out = status('q_test')
        assert out['result_location'] == 's3://bucket/results/exec-123.csv'

    def test_running_omits_result_location(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('RUNNING')
        out = status('q_test')
        assert 'result_location' not in out

    def test_updates_registry_status(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('RUNNING')
        status('q_test')
        table_mock.update_item.assert_called_once()

    def test_registry_update_failure_swallowed(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('RUNNING')
        table_mock.update_item.side_effect = RuntimeError('ddb down')
        out = status('q_test')  # must not raise
        assert out['status'] == 'RUNNING'

    def test_unknown_query_id_raises_404(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {}
        with pytest.raises(NotFoundError):
            status('q_missing')


@patch('config.table')
@patch('config.athena')
class TestResults:
    def test_header_skipped_on_first_page(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE
        out = results('q_test')
        assert out['query_id'] == 'q_test'
        assert out['columns'] == ['id', 'name']
        assert out['rows'] == [['1', 'Alice'], ['2', 'Bob']]
        assert ['id', 'name'] not in out['rows']
        assert 'next_page_token' not in out

    def test_header_kept_with_incoming_page_token(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE
        token = config._encode_token('athena-next-1')
        out = results('q_test', token)
        # Not the first page → the first row is real data, not the header.
        assert ['id', 'name'] in out['rows']
        # And Athena resumes from the decoded NextToken.
        assert athena_mock.get_query_results.call_args[1]['NextToken'] == 'athena-next-1'

    def test_next_page_token_round_trips(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        athena_mock.get_query_results.return_value = {
            'ResultSet': GET_QUERY_RESULTS_RESPONSE['ResultSet'],
            'NextToken': 'athena-next-xyz',
        }
        out = results('q_test')
        assert config._decode_token(out['next_page_token']) == 'athena-next-xyz'

    def test_not_succeeded_raises_409(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('RUNNING')
        with pytest.raises(ServiceError) as exc:
            results('q_test')
        assert exc.value.status_code == 409

    def test_unknown_query_id_raises_404(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {}
        with pytest.raises(NotFoundError):
            results('q_missing')
