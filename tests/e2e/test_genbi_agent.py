"""Live end-to-end tests for the GenBI agent on Bedrock AgentCore Runtime.

These drive the **deployed** runtime the way the frontend does — Cognito M2M token →
``POST /invocations`` → SSE frames — so they need AWS creds plus a deployed
``YmHackathonGenbiAgentAuthStack`` + ``YmHackathonGenbiAgentRuntimeStack`` (they auto-skip
otherwise, see ``conftest.py``). Nothing else in Python exercises the agent: a regression in the
SSE contract, the JWT authorizer, the skill, or the Athena tool would otherwise only surface in the
browser.

Assertions are structural and only lightly semantic — nothing keys off the model's wording,
phrasing or specific numbers, so a re-roll does not flake the suite.
"""

import pytest

from .conftest import SHIP_ID, answer_text, errors, new_session_id, tools_used

pytestmark = pytest.mark.e2e


def _has_cjk(text: str) -> bool:
    return any('一' <= c <= '鿿' for c in text)


class TestDataQuestion:
    """The canonical path: a Chinese data question, answered from the lake."""

    def test_streams_grounded_answer(self, agent_client):
        code, frames = agent_client.invoke({'prompt': 'S1 的 slip 趨勢如何？最近一次維修後有改善嗎？'})
        assert code == 200, frames
        assert errors(frames) == [], frames

        # Both tools must fire: the agent loaded the catalog *and* actually hit the data lake.
        # A missing athena_query means it answered from the system prompt alone — the exact
        # regression (skill or Athena permissions) this suite exists to catch.
        assert {'load_genbi_skill', 'athena_query'} <= tools_used(frames), tools_used(frames)

        answer = answer_text(frames)
        assert answer.strip(), frames
        assert SHIP_ID in answer, answer
        assert _has_cjk(answer), answer  # the system prompt's "reply in the user's language" rule


class TestSession:
    """The runtime session header: same id → same microVM → the agent keeps the history."""

    def test_session_id_preserves_context(self, agent_client):
        session_id = new_session_id()

        code, first = agent_client.invoke({'prompt': f'{SHIP_ID} 最近的平均航速大約多少？'}, session_id=session_id)
        assert code == 200, first
        assert errors(first) == [], first
        assert SHIP_ID in answer_text(first), answer_text(first)

        # Never names the ship: only conversation history can resolve「同一艘船」to S1.
        code, second = agent_client.invoke({'prompt': '同一艘船，那滑失率呢？'}, session_id=session_id)
        assert code == 200, second
        assert errors(second) == [], second
        assert SHIP_ID in answer_text(second), answer_text(second)


class TestErrors:
    """The two deterministic failure paths: a bad payload, and no token."""

    def test_missing_prompt_yields_error_frame(self, agent_client):
        code, frames = agent_client.invoke({})
        assert code == 200, frames
        assert frames == [{'error': "Missing 'prompt' in payload."}], frames

    def test_unauthenticated_is_rejected(self, agent_client):
        code, frames = agent_client.invoke({'prompt': f'{SHIP_ID} 的 slip 趨勢如何？'}, auth=False)
        assert code in (401, 403), (code, frames)
        assert frames == [], frames
