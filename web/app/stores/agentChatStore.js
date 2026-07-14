import { defineStore } from 'pinia';
import { ChatConstant, InfiniteScrollConstant } from '~/constants';
import { UiData } from '~/models/server/uiData';
import { ChatSessionPins } from '~/models/ui/chatSession';

/**
 * @import { Agent } from '~/models/server/agent'
 * @import {ChatSession} from '~/models/server/chatSession'
 */

export const useAgentChatStore = defineStore('agentChat', () => {
  const server = useServer();

  /**
   * @type {Ref<Agent>}
   */
  const agent = ref(null);
  /**
   * @type {Ref<ChatSession[]>>}
   */
  const chatSessions = ref([]);
  /**
   * @type {Ref<ChatSession[]>>}
   */
  const pinnedSessions = ref([]);
  const pinnedSessionIds = ref([]);
  const pinsLoadedForAgentId = ref(null);
  const nextToken = ref(null);
  const isLoading = ref(false);
  const currentAgentId = ref(null);
  const currentSessionId = ref(null);
  const refresh = ref(0);
  const storageId = ref(null);
  const isNavigating = ref(false);
  const pendingDrafts = ref({});

  let navigationLockTimer = null;

  const reset = () => {
    agent.value = null;
    chatSessions.value = [];
    pinnedSessions.value = [];
    pinnedSessionIds.value = [];
    pinsLoadedForAgentId.value = null;
    nextToken.value = null;
    isLoading.value = false;
    currentAgentId.value = null;
    currentSessionId.value = null;
  };

  const isSessionPinned = sessionId => pinnedSessionIds.value.includes(sessionId);

  const persistPins = () => {
    if (!currentAgentId.value) return;
    const userId = useAuthStore().parsedToken?.sub;
    if (!userId) return;
    server.uiData.set(new UiData({
      key: ChatSessionPins.getUiDataKey(currentAgentId.value, userId),
      value: new ChatSessionPins({ sessionIds: pinnedSessionIds.value }),
    }));
  };

  const loadPins = async ({ agentId, userId } = {}) => {
    if (!agentId || !userId) return;
    if (pinsLoadedForAgentId.value === agentId) return;
    if (!currentAgentId.value) currentAgentId.value = agentId;

    const { data, error } = await server.uiData.get({
      key: ChatSessionPins.getUiDataKey(agentId, userId),
    }, { lazy: false });
    if (error.value) return;
    const storedIds = data.value?.value?.sessionIds ?? [];
    if (!storedIds.length) {
      pinnedSessionIds.value = [];
      pinnedSessions.value = [];
      pinsLoadedForAgentId.value = agentId;
      return;
    }
    const { data: listData, error: listError } = await server.chatSession.list({
      agentId,
      sessionIds: storedIds,
    }, { lazy: false });
    if (listError.value) {
      pinnedSessionIds.value = storedIds;
      pinnedSessions.value = [];
      pinsLoadedForAgentId.value = agentId;
      return;
    }
    const sessionMap = new Map(listData.value.data.map(s => [s.sessionId, s]));
    const validIds = storedIds.filter(id => sessionMap.has(id));
    pinnedSessionIds.value = validIds;
    pinnedSessions.value = validIds.map(id => sessionMap.get(id));
    pinsLoadedForAgentId.value = agentId;

    if (validIds.length !== storedIds.length) {
      persistPins();
    }
  };

  const pinChatSession = (sessionId) => {
    if (!sessionId || isSessionPinned(sessionId)) return { ok: true };
    if (pinnedSessionIds.value.length >= ChatConstant.Pin.MAX_COUNT) return { error: 'limit' };
    const session = chatSessions.value.find(s => s.sessionId === sessionId);
    if (!session) return { error: 'not_found' };
    pinnedSessionIds.value = [sessionId, ...pinnedSessionIds.value];
    pinnedSessions.value = [session, ...pinnedSessions.value];
    persistPins();
    return { ok: true };
  };

  const unpinChatSession = (sessionId) => {
    if (!isSessionPinned(sessionId)) return;
    pinnedSessionIds.value = pinnedSessionIds.value.filter(id => id !== sessionId);
    pinnedSessions.value = pinnedSessions.value.filter(s => s.sessionId !== sessionId);
    persistPins();
  };

  const fetchAgent = async (agentId) => {
    if (agent.value?.id === agentId) return;
    const { data, error } = await server.agent.get({ agentId }, { lazy: false });
    if (error.value) return;
    agent.value = data.value;
  };

  const loadChatSessions = async ({ agentId, done = () => {} } = {}) => {
    if (!agentId) return;
    if (isLoading.value) return;
    if (currentAgentId.value && currentAgentId.value !== agentId) {
      reset();
    }
    if (!currentAgentId.value) {
      currentAgentId.value = agentId;
    }
    if (nextToken.value === null && chatSessions.value.length > 0) {
      done(InfiniteScrollConstant.LoadStatus.EMPTY);
      return;
    }
    isLoading.value = true;
    const { data, error } = await server.chatSession.list({
      agentId,
      nextToken: nextToken.value,
    }, {
      lazy: false,
    });
    if (error.value) {
      done(InfiniteScrollConstant.LoadStatus.EMPTY);
      isLoading.value = false;
      return;
    }
    chatSessions.value.push(...data.value.data);
    nextToken.value = data.value.nextToken;
    done(nextToken.value ? InfiniteScrollConstant.LoadStatus.OK : InfiniteScrollConstant.LoadStatus.EMPTY);
    isLoading.value = false;
  };

  const prependChatSession = (chatSession) => {
    chatSessions.value.unshift(chatSession);
  };

  const moveChatSessionToFront = (sessionId) => {
    const newTs = Date.now();
    const pinned = pinnedSessions.value.find(s => s.sessionId === sessionId);
    if (pinned) {
      pinned.lastMessageTs = newTs;
    }
    const index = chatSessions.value.findIndex(s => s.sessionId === sessionId);
    if (index <= 0) return;
    const [session] = chatSessions.value.splice(index, 1);
    session.lastMessageTs = newTs;
    chatSessions.value.unshift(session);
  };

  const deleteChatSession = async ({ agentId, sessionId }) => {
    const { error } = await server.chatSession.remove({ agentId, sessionId }, { lazy: false });
    if (error.value) return;
    chatSessions.value = chatSessions.value.filter(s => s.sessionId !== sessionId);
    if (isSessionPinned(sessionId)) {
      pinnedSessionIds.value = pinnedSessionIds.value.filter(id => id !== sessionId);
      pinnedSessions.value = pinnedSessions.value.filter(s => s.sessionId !== sessionId);
      persistPins();
    }
  };

  const renameChatSession = async ({ agentId, sessionId, sessionName }) => {
    const { error } = await server.chatSession.update({ agentId, sessionId, sessionName }, { lazy: false });
    if (error.value) return;
    const chatSession = chatSessions.value.find(s => s.sessionId === sessionId);
    if (chatSession) {
      chatSession.sessionName = sessionName;
    }
    const pinned = pinnedSessions.value.find(s => s.sessionId === sessionId);
    if (pinned) {
      pinned.sessionName = sessionName;
    }
  };

  const restartChat = () => {
    refresh.value += 1;
  };

  const setStorageId = (id) => {
    storageId.value = id;
  };

  const setCurrentSessionId = (id) => {
    currentSessionId.value = id;
  };

  const setPendingDraft = (agentId, text) => {
    if (!agentId || !text) return;
    pendingDrafts.value[agentId] = text;
  };

  const consumePendingDraft = (agentId) => {
    const draft = pendingDrafts.value[agentId];
    if (draft === undefined) return null;
    delete pendingDrafts.value[agentId];
    return draft;
  };

  const lockNavigation = () => {
    isNavigating.value = true;
    clearTimeout(navigationLockTimer);
    navigationLockTimer = setTimeout(() => {
      isNavigating.value = false;
    }, 1000);
  };

  return {
    agent,
    chatSessions,
    pinnedSessions,
    pinnedSessionIds,
    currentSessionId,
    isLoading,
    isNavigating,
    nextToken,
    refresh,
    storageId,
    fetchAgent,
    isSessionPinned,
    loadPins,
    pinChatSession,
    unpinChatSession,
    lockNavigation,
    moveChatSessionToFront,
    deleteChatSession,
    renameChatSession,
    loadChatSessions,
    prependChatSession,
    reset,
    restartChat,
    setCurrentSessionId,
    setPendingDraft,
    consumePendingDraft,
    setStorageId,
  };
});
