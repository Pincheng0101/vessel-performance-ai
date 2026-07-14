import json
import os
import sys
from pathlib import Path

import pytest

# The two Lambda packages (athena_query, async_query_api) share flat module names
# (config, router). Evict any sibling copies and put THIS Lambda's dir first so the
# imports below — and the test modules' `from config import ...` — resolve to it.
_LAMBDA_DIR = str(Path(__file__).resolve().parents[4] / 'lambda_function' / 'async_query_api')
_SHARED_MODULES = ('config', 'router', 'handlers', 'queries', 'query_handler')
for _name in _SHARED_MODULES:
    sys.modules.pop(_name, None)
if _LAMBDA_DIR in sys.path:
    sys.path.remove(_LAMBDA_DIR)
sys.path.insert(0, _LAMBDA_DIR)

# config.py builds a DynamoDB resource + Athena client at import — needs a region and table name.
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-west-2')
os.environ.setdefault('QUERY_TABLE', 'test-query-registry')

import config as _config  # noqa: E402
import handlers as _handlers  # noqa: E402
import queries as _queries  # noqa: E402
import router as _router  # noqa: E402

_LOCAL_MODULES = {'config': _config, 'handlers': _handlers, 'queries': _queries, 'router': _router}


@pytest.fixture(autouse=True)
def _use_local_modules():
    # Collection imported both Lambdas under the same flat names, so sys.modules ends up
    # pointing at whichever loaded last. Repoint to THIS package before each test so
    # @patch('config.X') and the handlers' bound `config` reference agree.
    for name, mod in _LOCAL_MODULES.items():
        sys.modules[name] = mod
    yield


# Athena runtime config as stored in SSM (JSON string).
SSM_ATHENA_CONFIG = {'database': 'test_db', 'catalog': 'AwsDataCatalog', 'workgroup': 'ym-hackathon'}
SSM_ATHENA_CONFIG_JSON = json.dumps(SSM_ATHENA_CONFIG)

# A fake DynamoDB registry item (the shape config.get_registry returns).
REGISTRY_ITEM = {
    'query_id': 'q_test',
    'exec_id': 'exec-123',
    'query_type': 'vessel_recommendation',
    'status': 'PENDING',
    'ttl': 9999999999,
}


def get_query_execution_response(state='SUCCEEDED', location='s3://bucket/results/exec-123.csv'):
    query_execution = {'Status': {'State': state}}
    if location is not None:
        query_execution['ResultConfiguration'] = {'OutputLocation': location}
    return {'QueryExecution': query_execution}


# get_query_results ResultSet: header row + two data rows, two columns (id, name).
GET_QUERY_RESULTS_RESPONSE = {
    'ResultSet': {
        'ResultSetMetadata': {'ColumnInfo': [{'Name': 'id'}, {'Name': 'name'}]},
        'Rows': [
            {'Data': [{'VarCharValue': 'id'}, {'VarCharValue': 'name'}]},
            {'Data': [{'VarCharValue': '1'}, {'VarCharValue': 'Alice'}]},
            {'Data': [{'VarCharValue': '2'}, {'VarCharValue': 'Bob'}]},
        ],
    },
}
