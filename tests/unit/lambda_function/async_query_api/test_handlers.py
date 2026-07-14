from unittest.mock import patch

import config
import pytest
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, NotFoundError, ServiceError
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
        out = submit(_body({'query_type': 'fact_recommendation', 'params': {'ship_id': 'S1'}}))
        assert out['status'] == 'PENDING'
        assert out['query_id'].startswith('q_')

    def test_execution_parameters_bind_values(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        submit(_body({'query_type': 'fact_recommendation', 'params': {'ship_id': 'S1'}}))
        kwargs = athena_mock.start_query_execution.call_args[1]
        # Athena requires string execution parameters to be single-quoted literals.
        assert kwargs['ExecutionParameters'] == ["'S1'"]
        assert kwargs['WorkGroup'] == 'ym-hackathon'
        assert kwargs['QueryExecutionContext'] == {'Database': 'test_db', 'Catalog': 'AwsDataCatalog'}

    def test_no_execution_parameters_when_no_binds(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        # dim_port takes no params → no execution parameters (agg_fleet_daily always binds fleet_id).
        submit(_body({'query_type': 'dim_port', 'params': {}}))
        assert 'ExecutionParameters' not in athena_mock.start_query_execution.call_args[1]

    def test_registry_written_with_exec_id_type_ttl(self, ssm_mock, athena_mock, table_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'exec-abc'}
        out = submit(_body({'query_type': 'fact_recommendation', 'params': {'ship_id': 'S1'}}))
        item = table_mock.put_item.call_args[1]['Item']
        assert item['query_id'] == out['query_id']
        assert item['exec_id'] == 'exec-abc'
        assert item['query_type'] == 'fact_recommendation'
        assert isinstance(item['ttl'], int)

    def test_unknown_query_type_rejected_by_model(self, ssm_mock, athena_mock, table_mock):
        # query_type is the union discriminator, so an unknown value fails validation up front.
        with pytest.raises(ValidationError):
            _body({'query_type': 'nope', 'params': {}})

    def test_wrong_params_for_type_rejected(self, ssm_mock, athena_mock, table_mock):
        # ship_speed_power requires params.ship_id; omitting it fails the typed variant.
        with pytest.raises(ValidationError):
            _body({'query_type': 'ship_speed_power', 'params': {}})


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

    def test_failed_surfaces_athena_reason(self, athena_mock, table_mock):
        # Athena's StateChangeReason is the only diagnosis a caller ever gets.
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response(
            'FAILED', reason='SYNTAX_ERROR: column does not exist'
        )
        out = status('q_test')
        assert out['status'] == 'FAILED'
        assert out['error'] == 'SYNTAX_ERROR: column does not exist'

    def test_failed_without_reason_still_reports_error(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('CANCELLED')
        out = status('q_test')
        assert out['status'] == 'FAILED'
        assert out['error']

    def test_succeeded_has_no_error(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        assert 'error' not in status('q_test')

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

    @pytest.mark.parametrize('athena_state', ['QUEUED', 'RUNNING'])
    def test_still_running_raises_retryable_409(self, athena_mock, table_mock, athena_state):
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response(athena_state)
        with pytest.raises(ServiceError) as exc:
            results('q_test')
        assert exc.value.status_code == 409

    @pytest.mark.parametrize('athena_state', ['FAILED', 'CANCELLED'])
    def test_terminal_failure_raises_400_not_409(self, athena_mock, table_mock, athena_state):
        # A failed query never becomes SUCCEEDED, so a 409 "poll until SUCCEEDED" would send
        # the caller into an infinite loop. 400 + Athena's reason ends it.
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response(
            athena_state, reason='SYNTAX_ERROR: boom'
        )
        with pytest.raises(BadRequestError) as exc:
            results('q_test')
        assert exc.value.status_code == 400
        assert 'SYNTAX_ERROR: boom' in str(exc.value.msg)

    def test_malformed_page_token_raises_400(self, athena_mock, table_mock):
        # A bad token is client error, not a 500 out of binascii.
        table_mock.get_item.return_value = {'Item': dict(REGISTRY_ITEM)}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        with pytest.raises(BadRequestError):
            results('q_test', 'not-valid-base64!!')

    def test_unknown_query_id_raises_404(self, athena_mock, table_mock):
        table_mock.get_item.return_value = {}
        with pytest.raises(NotFoundError):
            results('q_missing')
