from unittest.mock import patch

import pytest
from router import lambda_handler


class TestRouter:
    def test_unsupported_action_raises(self):
        with pytest.raises(ValueError, match='Unsupported action: bad_action'):
            lambda_handler({'action': 'bad_action'}, None)

    def test_none_action_raises(self):
        with pytest.raises(ValueError, match='Unsupported action: None'):
            lambda_handler({}, None)

    @patch('query_handler.handle')
    def test_run_query_action_delegates(self, mock_handle):
        mock_handle.return_value = {'row_count': 0}
        lambda_handler({'action': 'run_query', 'sql': 'SELECT 1'}, None)
        assert mock_handle.call_args[0][0] == {'sql': 'SELECT 1'}

    @patch('query_handler.handle')
    def test_action_key_stripped_from_payload(self, mock_handle):
        mock_handle.return_value = {'row_count': 0}
        lambda_handler({'action': 'run_query', 'sql': 'SELECT 1', 'max_rows': 5}, None)
        payload = mock_handle.call_args[0][0]
        assert 'action' not in payload
        assert payload == {'sql': 'SELECT 1', 'max_rows': 5}
