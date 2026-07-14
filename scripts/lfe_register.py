"""Register the ``lfe_resource/`` resources on a LangForge Enterprise deployment.

Reads ``lfe_resource/{connector,llm,skill,agent}/*.json`` in dependency order, resolves
``${file:path}`` (inline text, relative to ``lfe_resource/``), ``${env:KEY}``
(``os.environ``), and ``${<type>:name}`` (ids of resources created earlier in the same
run) placeholders, then POSTs ``resource/create-<type>`` — or ``resource/update-<type>``
when a resource with the same name already exists (matched via ``resource/list-<type>s``).

Side effects: creates/updates resources on the remote LangForge API only; nothing local.

Usage:
    uv run python scripts/lfe_register.py

Settings come from the environment or a repo-root ``.env`` file (KEY=VALUE lines;
shell environment wins over the file): ``LFE_BASE_URL``, ``LFE_API_KEY``, optional
``LFE_AUTH_TOKEN``, plus any ``${env:...}`` keys used in resource files (e.g.
``YM_DATALAKE_AWS_ACCOUNT_ID``, ``YM_DATALAKE_ATHENA_ROLE_NAME``).
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

RESOURCE_ORDER = ('connector', 'llm', 'skill', 'agent')
REPO_ROOT = Path(__file__).resolve().parent.parent
RESOURCE_ROOT = REPO_ROOT / 'lfe_resource'

_RESOURCE_RE = re.compile(r'\$\{(' + '|'.join(RESOURCE_ORDER) + r'):([A-Za-z0-9_\-]+)\}')
_ENV_RE = re.compile(r'\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}')
_FILE_RE = re.compile(r'\$\{file:([^}]+)\}')


class PlaceholderError(ValueError):
    pass


def load_dotenv(path: Path) -> None:
    """Load KEY=VALUE lines from ``path`` into ``os.environ``; existing variables win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def resolve(obj: Any, ids: dict[str, dict[str, str]], root: Path) -> Any:
    """Recursively replace ``${file:path}`` and ``${<type>:<name>}`` placeholders in a body."""
    if isinstance(obj, dict):
        return {k: resolve(v, ids, root) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve(v, ids, root) for v in obj]
    if not isinstance(obj, str):
        return obj
    file_match = _FILE_RE.fullmatch(obj)
    if file_match:
        path = root / file_match.group(1)
        if not path.is_file():
            raise PlaceholderError(f'Unresolved placeholder ${{file:{file_match.group(1)}}} — no such file.')
        return path.read_text(encoding='utf-8')

    def _sub_resource(match: re.Match) -> str:
        rtype, name = match.group(1), match.group(2)
        resource_id = ids.get(rtype, {}).get(name)
        if resource_id is None:
            raise PlaceholderError(f'Unresolved placeholder ${{{rtype}:{name}}} — resource not created yet.')
        return resource_id

    def _sub_env(match: re.Match) -> str:
        key = match.group(1)
        if key not in os.environ:
            raise PlaceholderError(f'Unresolved placeholder ${{env:{key}}} — environment variable not set.')
        return os.environ[key]

    return _ENV_RE.sub(_sub_env, _RESOURCE_RE.sub(_sub_resource, obj))


class LfeClient:
    """Minimal all-POST RPC client for the LangForge API (mirrors the ``lfe`` CLI surface)."""

    def __init__(self, base_url: str, api_key: str, auth_token: str | None = None) -> None:
        self.base_url = base_url.rstrip('/')
        self.headers = {'x-api-key': api_key, 'content-type': 'application/json'}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'

    def post(self, path: str, body: dict) -> dict:
        request = urllib.request.Request(
            f'{self.base_url}/{path}',
            data=json.dumps(body).encode(),
            headers=self.headers,
            method='POST',
        )
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read())


def _find_existing(client, rtype: str, name: str) -> str | None:
    response = client.post(
        f'resource/list-{rtype}s',
        {'filters': [{'field': f'{rtype}_name', 'operator': '=', 'value': name}], 'limit': 10},
    )
    for item in response.get(f'{rtype}s', []):
        if item.get(f'{rtype}_name') == name:
            return item[f'{rtype}_id']
    return None


def register(client, root: Path) -> dict[str, dict[str, str]]:
    """Create/update every resource under ``root`` in dependency order; return {type: {name: id}}."""
    ids: dict[str, dict[str, str]] = {}
    for rtype in RESOURCE_ORDER:
        type_dir = root / rtype
        if not type_dir.is_dir():
            continue
        for path in sorted(type_dir.glob('*.json')):
            body = resolve(json.loads(path.read_text(encoding='utf-8')), ids, root)
            name = body[f'{rtype}_name']
            existing_id = _find_existing(client, rtype, name)
            if existing_id:
                # Update responses carry no resource body (some are just {"status"}) —
                # reuse the id from the lookup.
                client.post(f'resource/update-{rtype}', {f'{rtype}_id': existing_id, **body})
                resource_id = existing_id
            else:
                response = client.post(f'resource/create-{rtype}', body)
                resource_id = response[rtype][f'{rtype}_id']
            ids.setdefault(rtype, {})[name] = resource_id
    return ids


def main() -> None:
    load_dotenv(REPO_ROOT / '.env')
    base_url = os.environ.get('LFE_BASE_URL')
    api_key = os.environ.get('LFE_API_KEY')
    if not base_url or not api_key:
        sys.exit('Set LFE_BASE_URL and LFE_API_KEY (env or .env; optional LFE_AUTH_TOKEN).')
    client = LfeClient(base_url, api_key, os.environ.get('LFE_AUTH_TOKEN'))
    ids = register(client, RESOURCE_ROOT)
    print(json.dumps(ids, indent=2))


if __name__ == '__main__':
    main()
