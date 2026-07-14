from unittest.mock import patch

import pytest
from query_handler import handle

from .conftest import (
    GET_QUERY_RESULTS_RESPONSE,
    SSM_ATHENA_CONFIG_JSON,
    get_query_execution_response,
)


@patch('config.athena')
@patch('config.ssm')
class TestRunQueryHandle:
    def test_happy_path_parses_columns_and_rows(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE

        result = handle({'sql': 'SELECT id, name FROM t'})

        assert result['query_execution_id'] == 'qid-123'
        assert result['columns'] == ['id', 'name']
        assert result['rows'] == [['1', 'Alice'], ['2', 'Bob']]
        assert result['row_count'] == 2

    def test_header_row_skipped(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        _wire_default(athena_mock)
        result = handle({'sql': 'SELECT 1'})
        # Header ['id','name'] must not appear as a data row.
        assert ['id', 'name'] not in result['rows']

    def test_query_string_and_context_passed_to_start(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        _wire_default(athena_mock)
        handle({'sql': 'SELECT 42 AS x'})
        kwargs = athena_mock.start_query_execution.call_args[1]
        assert kwargs['QueryString'] == 'SELECT 42 AS x'
        assert kwargs['WorkGroup'] == 'ym-hackathon'
        assert kwargs['QueryExecutionContext'] == {'Database': 'test_db', 'Catalog': 'AwsDataCatalog'}

    def test_event_overrides_database_and_catalog(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        _wire_default(athena_mock)
        handle({'sql': 'SELECT 1', 'database': 'other_db', 'catalog': 'OtherCatalog'})
        context = athena_mock.start_query_execution.call_args[1]['QueryExecutionContext']
        assert context == {'Database': 'other_db', 'Catalog': 'OtherCatalog'}

    def test_max_rows_caps_rows(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        _wire_default(athena_mock)
        result = handle({'sql': 'SELECT 1', 'max_rows': 1})
        assert result['row_count'] == 1
        assert result['rows'] == [['1', 'Alice']]

    def test_failed_query_raises(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-fail'}
        athena_mock.get_query_execution.return_value = get_query_execution_response(
            'FAILED', reason='SYNTAX_ERROR: boom'
        )
        with pytest.raises(RuntimeError, match='FAILED'):
            handle({'sql': 'SELECT bad'})

    def test_polls_until_terminal_state(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
        athena_mock.get_query_execution.side_effect = [
            get_query_execution_response('QUEUED'),
            get_query_execution_response('RUNNING'),
            get_query_execution_response('SUCCEEDED'),
        ]
        athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE
        with patch('config.time.sleep'):
            result = handle({'sql': 'SELECT 1'})
        assert athena_mock.get_query_execution.call_count == 3
        assert result['row_count'] == 2

    def test_paginated_results(self, ssm_mock, athena_mock):
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        page1 = {
            'ResultSet': {
                'ResultSetMetadata': {'ColumnInfo': [{'Name': 'id'}]},
                'Rows': [
                    {'Data': [{'VarCharValue': 'id'}]},
                    {'Data': [{'VarCharValue': '1'}]},
                ],
            },
            'NextToken': 'tok',
        }
        page2 = {
            'ResultSet': {
                'ResultSetMetadata': {'ColumnInfo': [{'Name': 'id'}]},
                'Rows': [
                    {'Data': [{'VarCharValue': '2'}]},
                ],
            },
        }
        athena_mock.get_query_results.side_effect = [page1, page2]
        result = handle({'sql': 'SELECT id FROM t', 'max_rows': 100})
        assert result['columns'] == ['id']
        assert result['rows'] == [['1'], ['2']]
        assert result['row_count'] == 2


def _wire_default(athena_mock):
    athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
    athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
    athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE
