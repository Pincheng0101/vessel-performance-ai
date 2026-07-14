"""Unit tests for scripts/lfe_register.py — offline, HTTP mocked via a fake client."""

import json
import os

import pytest

from scripts.lfe_register import RESOURCE_ORDER, PlaceholderError, load_dotenv, register, resolve

# ---------------------------------------------------------------------------
# resolve()
# ---------------------------------------------------------------------------


def test_resolve_file_placeholder(tmp_path):
    (tmp_path / 'skill').mkdir()
    (tmp_path / 'skill' / 'guide.md').write_text('# Guide\ncontent', encoding='utf-8')
    out = resolve({'skill_markdown': '${file:skill/guide.md}'}, {}, tmp_path)
    assert out == {'skill_markdown': '# Guide\ncontent'}


def test_resolve_resource_placeholder(tmp_path):
    ids = {'llm': {'my-llm': 'llm-abc123'}, 'skill': {'my-skill': 'skill-def456'}}
    body = {'llm_id': '${llm:my-llm}', 'tools': [{'skill_id': '${skill:my-skill}'}]}
    out = resolve(body, ids, tmp_path)
    assert out == {'llm_id': 'llm-abc123', 'tools': [{'skill_id': 'skill-def456'}]}


def test_resolve_leaves_plain_values(tmp_path):
    body = {'name': 'x', 'read_only': True, 'connector_id': None, 'n': 3}
    assert resolve(body, {}, tmp_path) == body


def test_resolve_unresolved_resource_raises(tmp_path):
    with pytest.raises(PlaceholderError):
        resolve({'llm_id': '${llm:missing}'}, {}, tmp_path)


def test_resolve_missing_file_raises(tmp_path):
    with pytest.raises(PlaceholderError):
        resolve({'p': '${file:nope.md}'}, {}, tmp_path)


def test_resolve_env_placeholder(tmp_path, monkeypatch):
    monkeypatch.setenv('MY_ACCOUNT_ID', '123456789012')
    assert resolve({'account_id': '${env:MY_ACCOUNT_ID}'}, {}, tmp_path) == {'account_id': '123456789012'}


def test_resolve_missing_env_raises(tmp_path, monkeypatch):
    monkeypatch.delenv('NOPE_ENV_KEY', raising=False)
    with pytest.raises(PlaceholderError):
        resolve({'account_id': '${env:NOPE_ENV_KEY}'}, {}, tmp_path)


def test_resolve_connector_placeholder(tmp_path):
    ids = {'connector': {'my-conn': 'connector-abc'}}
    assert resolve({'connector_id': '${connector:my-conn}'}, ids, tmp_path) == {'connector_id': 'connector-abc'}


# ---------------------------------------------------------------------------
# load_dotenv()
# ---------------------------------------------------------------------------


def test_load_dotenv_sets_values(tmp_path, monkeypatch):
    monkeypatch.delenv('DOTENV_A', raising=False)
    monkeypatch.delenv('DOTENV_B', raising=False)
    env = tmp_path / '.env'
    env.write_text('# comment\nDOTENV_A=plain\n\nDOTENV_B="quoted value"\n', encoding='utf-8')
    load_dotenv(env)
    assert os.environ['DOTENV_A'] == 'plain'
    assert os.environ['DOTENV_B'] == 'quoted value'


def test_load_dotenv_does_not_override_existing(tmp_path, monkeypatch):
    monkeypatch.setenv('DOTENV_C', 'from-shell')
    env = tmp_path / '.env'
    env.write_text('DOTENV_C=from-file\n', encoding='utf-8')
    load_dotenv(env)
    assert os.environ['DOTENV_C'] == 'from-shell'


def test_load_dotenv_missing_file_is_noop(tmp_path):
    load_dotenv(tmp_path / 'nope.env')


# ---------------------------------------------------------------------------
# register()
# ---------------------------------------------------------------------------


class FakeClient:
    """Records POSTs; serves canned list/create/update responses."""

    def __init__(self, existing=None):
        self.calls = []
        self._existing = existing or {}  # rtype -> {name: id}
        self._n = 0

    def post(self, path, body):
        self.calls.append((path, body))
        action, rtype = path.removeprefix('resource/').split('-', 1)
        if action == 'list':
            rtype = rtype.rstrip('s')
            name = body['filters'][0]['value']
            found = self._existing.get(rtype, {}).get(name)
            items = [{f'{rtype}_id': found, f'{rtype}_name': name}] if found else []
            return {f'{rtype}s': items, 'next_token': None}
        if action == 'create':
            self._n += 1
            return {rtype: {f'{rtype}_id': f'{rtype}-new{self._n}'}}
        if action == 'update':
            # Update responses carry no resource body (e.g. ConnectorUpdateResponse is
            # just {"status"}); the register script must reuse the id it looked up.
            return {'status': 'updated'}
        raise AssertionError(f'unexpected path {path}')


@pytest.fixture
def resource_root(tmp_path):
    (tmp_path / 'connector').mkdir()
    (tmp_path / 'llm').mkdir()
    (tmp_path / 'skill').mkdir()
    (tmp_path / 'agent' / 'prompts').mkdir(parents=True)
    (tmp_path / 'connector' / 'my-conn.json').write_text(
        json.dumps({'connector_name': 'my-conn', 'connector_type': 'aws', 'region_name': 'us-west-2'})
    )
    (tmp_path / 'llm' / 'my-llm.json').write_text(json.dumps({'llm_name': 'my-llm', 'llm_type': 'bedrock.anthropic'}))
    (tmp_path / 'skill' / 'my-skill.md').write_text('# Skill body')
    (tmp_path / 'skill' / 'my-skill.json').write_text(
        json.dumps({'skill_name': 'my-skill', 'skill_markdown': '${file:skill/my-skill.md}'})
    )
    (tmp_path / 'agent' / 'prompts' / 'my-agent.md').write_text('# Prompt body')
    (tmp_path / 'agent' / 'my-agent.json').write_text(
        json.dumps(
            {
                'agent_name': 'my-agent',
                'agent_prompt': '${file:agent/prompts/my-agent.md}',
                'llm_id': '${llm:my-llm}',
                'tools': [
                    {'tool_type': 'skill', 'skill_id': '${skill:my-skill}'},
                    {'tool_type': 'athena_client', 'connector_id': '${connector:my-conn}'},
                ],
            }
        )
    )
    return tmp_path


def test_register_creates_in_dependency_order(resource_root):
    client = FakeClient()
    ids = register(client, resource_root)

    create_paths = [p for p, _ in client.calls if p.startswith('resource/create-')]
    assert create_paths == [
        'resource/create-connector',
        'resource/create-llm',
        'resource/create-skill',
        'resource/create-agent',
    ]
    assert ids == {
        'connector': {'my-conn': 'connector-new1'},
        'llm': {'my-llm': 'llm-new2'},
        'skill': {'my-skill': 'skill-new3'},
        'agent': {'my-agent': 'agent-new4'},
    }


def test_register_wires_ids_and_inlines_files(resource_root):
    client = FakeClient()
    register(client, resource_root)

    agent_body = next(b for p, b in client.calls if p == 'resource/create-agent')
    assert agent_body['llm_id'] == 'llm-new2'
    assert agent_body['tools'][0]['skill_id'] == 'skill-new3'
    assert agent_body['tools'][1]['connector_id'] == 'connector-new1'
    assert agent_body['agent_prompt'] == '# Prompt body'
    skill_body = next(b for p, b in client.calls if p == 'resource/create-skill')
    assert skill_body['skill_markdown'] == '# Skill body'


def test_register_updates_existing_resource(resource_root):
    client = FakeClient(existing={'llm': {'my-llm': 'llm-old9'}})
    ids = register(client, resource_root)

    update_paths = [(p, b) for p, b in client.calls if p.startswith('resource/update-')]
    assert update_paths[0][0] == 'resource/update-llm'
    assert update_paths[0][1]['llm_id'] == 'llm-old9'
    assert ids['llm']['my-llm'] == 'llm-old9'
    # skill/agent had no existing entries → created
    assert ids['agent']['my-agent'].startswith('agent-new')


def test_register_skips_missing_type_dirs(tmp_path):
    (tmp_path / 'llm').mkdir()
    (tmp_path / 'llm' / 'only-llm.json').write_text(json.dumps({'llm_name': 'only-llm'}))
    client = FakeClient()
    ids = register(client, tmp_path)
    assert ids == {'llm': {'only-llm': 'llm-new1'}}


def test_resource_order():
    assert RESOURCE_ORDER == ('connector', 'llm', 'skill', 'agent')
