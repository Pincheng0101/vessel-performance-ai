import { InfiniteScrollConstant } from '~/constants';

/**
 * Loads and paginates a read-only chat session transcript for an agent.
 *
 * Guards against stale responses: when the target session or user changes while
 * a page request is in flight, the late response is discarded instead of leaking
 * into the now-current transcript or overwriting its pagination state.
 *
 * @param {object} options
 * @param {() => string} options.agentId - Getter for the agent id.
 * @param {() => string|null} options.sessionId - Getter for the session id.
 * @param {() => string|null} [options.username] - Getter for the session owner's username.
 * @param {() => boolean} [options.hasMessages] - Getter for whether the session has history; skips the round-trip when false.
 */
export default function useChatTranscript({
  agentId,
  sessionId,
  username = () => null,
  hasMessages = () => true,
}) {
  const server = useServer();

  const state = reactive({
    messages: [],
    nextToken: null,
    isEmpty: false,
    isLoading: false,
  });

  // Bumped whenever the target session/user changes; an in-flight load compares
  // its captured id against the latest value and bails if it no longer matches.
  let loadCounter = 0;

  const reset = () => {
    loadCounter += 1;
    state.messages = [];
    state.nextToken = null;
    state.isEmpty = false;
    state.isLoading = false;
  };

  const loadMessages = async ({ done }) => {
    if (!sessionId()) {
      return done(InfiniteScrollConstant.LoadStatus.EMPTY);
    }
    if (!hasMessages()) {
      state.isEmpty = true;
      return done(InfiniteScrollConstant.LoadStatus.EMPTY);
    }
    const loadId = loadCounter;
    state.isLoading = true;
    const { data, error } = await server.chatSession.listMessages({
      agentId: agentId(),
      sessionId: sessionId(),
      nextToken: state.nextToken,
      username: username(),
    }, {
      lazy: false,
    });
    // Session/user switched mid-flight — discard this page so it cannot mix into
    // the current transcript or clobber its pagination state.
    if (loadId !== loadCounter) {
      return;
    }
    state.isLoading = false;
    if (error.value) {
      return done(InfiniteScrollConstant.LoadStatus.ERROR);
    }
    state.isEmpty = !data.value.data.length;
    const older = chatUtils.convertGroupsToMessages(data.value.data);
    state.messages.unshift(...older);
    state.nextToken = data.value.nextToken;
    done(state.nextToken ? InfiniteScrollConstant.LoadStatus.OK : InfiniteScrollConstant.LoadStatus.EMPTY);
  };

  watch(() => [sessionId(), username()], reset);

  return {
    state,
    loadMessages,
    reset,
  };
}
