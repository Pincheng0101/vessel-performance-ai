from unittest.mock import patch

import config
import pytest
from pydantic import ValidationError
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

    def test_utility_statement_keeps_first_row(self, ssm_mock, athena_mock):
        # SHOW TABLES is UTILITY, not DML: Athena sends no header row, so row 0 is a real
        # table name and stripping it would silently lose one table.
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-show'}
        athena_mock.get_query_execution.return_value = get_query_execution_response(statement_type='UTILITY')
        athena_mock.get_query_results.return_value = {
            'ResultSet': {
                'ResultSetMetadata': {'ColumnInfo': [{'Name': 'tab_name'}]},
                'Rows': [
                    {'Data': [{'VarCharValue': 'dim_ship'}]},
                    {'Data': [{'VarCharValue': 'noon_report'}]},
                ],
            },
        }
        result = handle({'sql': 'SHOW TABLES'})
        assert result['rows'] == [['dim_ship'], ['noon_report']]
        assert result['row_count'] == 2

    def test_ddl_first_page_does_not_over_request_rows(self, ssm_mock, athena_mock):
        # The +1 MaxResults header allowance applies only where a header exists (first page
        # of a DML result set); a UTILITY page must ask for exactly max_rows.
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-show'}
        athena_mock.get_query_execution.return_value = get_query_execution_response(statement_type='UTILITY')
        athena_mock.get_query_results.return_value = {
            'ResultSet': {'ResultSetMetadata': {'ColumnInfo': [{'Name': 'tab_name'}]}, 'Rows': []},
        }
        handle({'sql': 'SHOW TABLES', 'max_rows': 10})
        assert athena_mock.get_query_results.call_args[1]['MaxResults'] == 10

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

    def test_poll_timeout_raises_with_execution_id(self, ssm_mock, athena_mock):
        # A query that never finishes must fail fast *with the id*, not let the Lambda be
        # killed at its timeout — a killed invoke loses the id, so the caller can no longer
        # poll or stop the query, which keeps running and billing on Athena.
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-slow'}
        athena_mock.get_query_execution.return_value = get_query_execution_response('RUNNING')
        with patch('config.time.sleep'), pytest.raises(TimeoutError, match='qid-slow'):
            handle({'sql': 'SELECT 1'})
        assert athena_mock.get_query_execution.call_count == config._MAX_POLL_ATTEMPTS

    def test_result_pages_capped(self, ssm_mock, athena_mock):
        # Athena handing back a NextToken with every page must not loop forever.
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
        athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
        athena_mock.get_query_results.return_value = {
            'ResultSet': {'ResultSetMetadata': {'ColumnInfo': [{'Name': 'id'}]}, 'Rows': []},
            'NextToken': 'endless',
        }
        result = handle({'sql': 'SELECT id FROM t', 'max_rows': 100})
        assert athena_mock.get_query_results.call_count == config._MAX_RESULT_PAGES
        assert result['rows'] == []
        # Columns come from the first page's metadata, so an empty result still has a schema.
        assert result['columns'] == ['id']

    @pytest.mark.parametrize('max_rows', [0, -1, 10_001])
    def test_out_of_range_max_rows_rejected(self, ssm_mock, athena_mock, max_rows):
        # max_rows=0 used to skip the fetch loop entirely and return no columns at all.
        ssm_mock.get.return_value = SSM_ATHENA_CONFIG_JSON
        _wire_default(athena_mock)
        with pytest.raises(ValidationError):
            handle({'sql': 'SELECT 1', 'max_rows': max_rows})


def _wire_default(athena_mock):
    athena_mock.start_query_execution.return_value = {'QueryExecutionId': 'qid-123'}
    athena_mock.get_query_execution.return_value = get_query_execution_response('SUCCEEDED')
    athena_mock.get_query_results.return_value = GET_QUERY_RESULTS_RESPONSE
