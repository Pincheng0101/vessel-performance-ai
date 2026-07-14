import { ChatInputDraft } from '~/models/ui/chatSession';

const PERSIST_DEBOUNCE_MS = 500;
const SESSION_ID_PATHNAME_RE = /\/chat\/([^/?#]+)/;

export function useChatInputDraft({ agentId }) {
  const resolveAgentId = () => toValue(agentId);
  // Source of truth is the URL pathname rather than reactive state because
  // AgentChatRoom updates the URL via history.replaceState (not router.replace)
  // when a new session id is assigned mid-stream, so state.sessionId can
  // diverge from the URL that the browser will load on refresh.
  const resolveSessionId = () => window.location.pathname.match(SESSION_ID_PATHNAME_RE)?.[1] ?? null;
  const resolveUserId = () => useAuthStore().parsedToken?.sub;

  const readInitial = () => ChatInputDraft.read({
    userId: resolveUserId(),
    agentId: resolveAgentId(),
    sessionId: resolveSessionId(),
  });

  const writeNow = text => ChatInputDraft.write({
    userId: resolveUserId(),
    agentId: resolveAgentId(),
    sessionId: resolveSessionId(),
    text,
  });

  const persist = useDebounceFn(writeNow, PERSIST_DEBOUNCE_MS);

  const clear = () => ChatInputDraft.clear({
    userId: resolveUserId(),
    agentId: resolveAgentId(),
    sessionId: resolveSessionId(),
  });

  return {
    readInitial,
    persist,
    clear,
  };
}
