<script setup>
import { AgentConstant, ChatConstant, IconConstant, InfiniteScrollConstant, ResourceConstant, StorageConstant, StreamingConstant } from '~/constants';
import { StartAgent } from '~/models/server/agent';
import { ChatSession } from '~/models/server/chatSession';
import { TextContentBlock } from '~/models/server/contentBlock';
import { UiData } from '~/models/server/uiData';
import { AgentUserPreferences, LambdaBaseInputMap } from '~/models/ui/agent';
import { ChatAnswersStreamingRequest, ChatTextStreamingRequest } from '~/models/websocket/chat';
import { LfeWebSocketClient } from '~/services/websocket';
import ChatRoomActionPromptCard from './ChatRoomActionPromptCard.vue';

/**
 * @import { ChatRoomMessage } from '~/models/ui/chatRoom'
 * @import { ChatStreamingResponse } from '~/models/websocket/chat'
 */

const props = defineProps({
  agent: {
    type: Object,
    required: true,
  },
  sessionId: {
    type: String,
    default: null,
  },
  storageId: {
    type: String,
    default: null,
  },
  llmId: {
    type: String,
    default: null,
  },
  hasMessages: {
    type: Boolean,
    default: true,
  },
});

const { t } = useI18n();

const agentChatStore = useAgentChatStore();
const breadcrumbStore = useBreadcrumbStore();
const server = useServer();
const snackbarStore = useSnackbarStore();
const { createSignal: createStartAgentSignal } = useAbortController();
const {
  loaderId,
  syncJobStatus,
  isSyncJobStatusCardVisible,
  initSyncJobStatusTracking,
} = useAgentSyncJobStatus({
  agentId: props.agent.id,
});

const agentRef = toRef(props, 'agent');

const {
  oauthMcpTools,
  hasOauthTools,
  getToolStatus,
  validate: validateMcpOauth,
  buildToolRuntimeConfig,
} = useMcpOauthValidation(agentRef);
const { connect: connectMcpOauth, isConnecting: isMcpConnecting, getError: getMcpError, reset: resetMcpOauth } = useMcpOauthConnect(async () => {
  await validateMcpOauth();
});

let isUnmounted = false;

// Runs only between turns (when not waiting on the agent): drops the idle socket quietly.
const userIdleTimer = useIdleTimer({
  timeout: ChatConstant.ConnectionTimeout.USER_IDLE,
  onTimeout: () => {
    disconnectChat();
  },
});

// Runs only while waiting on the agent: refreshed by any inbound activity, and on timeout
// surfaces a retryable error instead of leaving the UI stuck on a dead connection.
const responseStallTimer = useIdleTimer({
  timeout: ChatConstant.ConnectionTimeout.RESPONSE_STALL,
  onTimeout: () => {
    disconnectChat();
    const currentMessage = state.messages.find(m => m.id === state.currentMessageId);
    if (currentMessage && !currentMessage.isStatusFailed) {
      setErrorWidget(currentMessage, null, $t('__messageChatResponseTimeout'));
    }
    state.isSending = false;
  },
});

const chatRoomRef = ref();

const initialInputText = ref('');

const isMcpDialogOpen = ref(false);
const isMcpBannerDismissed = ref(false);

const state = reactive({
  /**
   * @type {LfeWebSocketClient}
   */
  wsClient: null,
  isConnecting: true,
  /**
   * @type {ChatRoomMessage[]}
   */
  messages: [],
  sessionId: null,
  nextToken: null,
  // Saved preference may point at an LLM that has since been removed from the agent's switchable list.
  selectedLlmId: props.agent?.llmIds?.includes(props.llmId) ? props.llmId : null,
  storageId: props.storageId,
  lambdaBaseInputMap: {},
  lambdaBaseInputSchemaFingerprint: null,
  hasSavedLambdaBaseInputDefault: false,
  shouldPersistLambdaBaseInputSession: false,
  isSending: false,
  currentMessageId: null,
  previousMessageId: null,
  sessionName: null,
  isLoading: false,
  isEmpty: false,
});

// One timer is armed at a time, switched by whether a request is in flight: while sending
// we watch for backend silence; between turns we watch for user inactivity.
watch(() => state.isSending, (sending) => {
  if (sending) {
    userIdleTimer.clear();
    responseStallTimer.refresh();
  } else {
    responseStallTimer.clear();
    userIdleTimer.refresh();
  }
});

const mcpPendingCount = computed(() => oauthMcpTools.value.filter(tool => getToolStatus(tool.mcpServerId) !== AgentConstant.McpOauthStatus.CONNECTED.value).length);

const isMcpOauthBannerVisible = computed(() =>
  hasOauthTools.value
  && mcpPendingCount.value > 0
  && !isMcpBannerDismissed.value
  && state.messages.length === 0
  && (state.isEmpty || !props.sessionId),
);

const initializeState = () => {
  state.sessionId = props.sessionId;
  breadcrumbStore.setBreadcrumb(props.agent.id, props.agent.name);
};

initializeState();

const draft = useChatInputDraft({
  agentId: () => props.agent.id,
});
initialInputText.value = draft.readInitial();

initSyncJobStatusTracking();

const loadMessages = async ({ done }) => {
  if (!state.sessionId) {
    return done(InfiniteScrollConstant.LoadStatus.EMPTY);
  }
  // Skip the round-trip when the caller already knows the session has no historical messages.
  if (!props.hasMessages) {
    state.isEmpty = true;
    return done(InfiniteScrollConstant.LoadStatus.EMPTY);
  }
  state.isLoading = true;
  const { data, error } = await server.chatSession.listMessages({
    agentId: props.agent.id,
    sessionId: state.sessionId,
    nextToken: state.nextToken,
  }, {
    lazy: false,
  });
  state.isLoading = false;
  if (error.value) {
    navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value)}/${props.agent.id}/chat`, { replace: true });
    done(InfiniteScrollConstant.LoadStatus.ERROR);
    return;
  }
  state.isEmpty = !data.value.data.length;
  const older = chatUtils.convertGroupsToMessages(data.value.data);
  state.messages.unshift(...older);
  state.nextToken = data.value.nextToken;
  done(state.nextToken ? InfiniteScrollConstant.LoadStatus.OK : InfiniteScrollConstant.LoadStatus.EMPTY);
};

const sendMessage = async ({ contentBlocks, pendingMessageId }) => {
  const firstTextBlock = contentBlocks.find(item => typeof item?.text === 'string' && item.text.trim());

  state.isSending = true;
  state.currentMessageId = pendingMessageId;
  state.sessionName = firstTextBlock?.text?.slice(0, 30) ?? (contentBlocks.length > 0 ? t('__fieldImage') : null);

  try {
    if (!state.wsClient?.isConnected) {
      await connectChat();
    }
    await waitFor(() => state.isConnecting === false);
    state.wsClient.chat(new ChatTextStreamingRequest({
      llmId: state.selectedLlmId,
      content: contentBlocks,
    }));
    draft.clear();
  } catch (error) {
    snackbarStore.setFailure(error.message);
    const pendingMessage = state.messages.find(m => m.id === pendingMessageId);
    if (pendingMessage) setErrorWidget(pendingMessage, error.message);
    state.isSending = false;
  }

  return false;
};

const sendAnswers = async ({ qaPairs, pendingMessageId }) => {
  state.isSending = true;
  state.currentMessageId = pendingMessageId;

  try {
    if (!state.wsClient?.isConnected) {
      await connectChat();
    }
    await waitFor(() => state.isConnecting === false);
    state.wsClient.chatAnswers(new ChatAnswersStreamingRequest({
      answers: qaPairs,
    }));
  } catch (error) {
    snackbarStore.setFailure(error.message);
    const pendingMessage = state.messages.find(m => m.id === pendingMessageId);
    if (pendingMessage) setErrorWidget(pendingMessage, error.message);
    state.isSending = false;
  }

  return false;
};

/**
 * @param {ChatStreamingResponse} message
 */
const handleMessage = (message) => {
  if (message.action !== StreamingConstant.Action.CHAT.value) return;

  const findCurrentById = ({ id }) => id === state.currentMessageId;
  const findPreviousById = ({ id }) => id === state.previousMessageId;
  const downgradeContentToThinkingSteps = (targetMessage) => {
    targetMessage.content.forEach((contentBlock) => {
      targetMessage.pushThinkingStep(contentBlock);
    });
    targetMessage.setContentBlock([]);
  };

  const syncChatSessionList = () => {
    const isNewSession = !agentChatStore.chatSessions.some(s => s.sessionId === state.sessionId);
    if (!isNewSession) {
      agentChatStore.moveChatSessionToFront(state.sessionId);
      return;
    }
    agentChatStore.prependChatSession(new ChatSession({
      agentId: props.agent.id,
      sessionId: state.sessionId,
      sessionName: state.sessionName,
      lastMessageTs: Date.now(),
    }));
  };

  const currentMessage = state.messages.find(findCurrentById);
  if (!currentMessage) return;
  if (currentMessage.isStatusFailed) return;

  try {
    switch (message.responseType) {
      case StreamingConstant.ResponseType.START.value:
        syncChatSessionList();
        replaceUrlWithCurrentSession();
        return;
      case StreamingConstant.ResponseType.DATA.value:
        switch (message.event.eventType) {
          case StreamingConstant.EventType.CONTENT_BLOCK_START.value:
            state.previousMessageId = state.currentMessageId;
            downgradeContentToThinkingSteps(state.messages.find(findPreviousById));
            currentMessage
              .pushContentBlock(message.event.contentBlock)
              .setStatus(ChatConstant.MessageStatus.COMPOSING);
            return;
          case StreamingConstant.EventType.CONTENT_BLOCK_DELTA.value:
            if (message.event.delta.text) {
              currentMessage
                .appendLatestContentBlockText(message.event.delta.text);
              return;
            }
            return;
          case StreamingConstant.EventType.TOOL_RESULTS.value:
            currentMessage
              .appendLatestContentBlockToolResults(message.event.toolResults);
            return;
          case StreamingConstant.EventType.MESSAGE_STOP.value:
            if (message.event.stopReason === StreamingConstant.StopReason.MAX_TURNS_REACHED.value) {
              currentMessage
                .setWidget({
                  component: ChatRoomActionPromptCard,
                  props: {
                    message: $t('__messageAgentMaxTurnsReached'),
                    actionLabel: $t('__actionNewChat'),
                    onAction: startNewConversation,
                  },
                })
                .setStatus(ChatConstant.MessageStatus.COMPLETED);

              state.isSending = false;
              return;
            }
            if (message.event.stopReason === StreamingConstant.StopReason.MAX_ITERATIONS_REACHED.value) {
              currentMessage
                .setWidget({
                  component: ChatRoomActionPromptCard,
                  props: {
                    message: $t('__messageAgentMaxIterationsReached'),
                    actionLabel: $t('__actionContinue'),
                    onAction: continueChat,
                  },
                })
                .setStatus(ChatConstant.MessageStatus.COMPLETED);

              state.isSending = false;
              return;
            }
        }
        break;
      case StreamingConstant.ResponseType.END.value:
        if (message.isAskUser && message.askUserQuestionPayload) {
          currentMessage.setAskUserQuestionPayload(message.askUserQuestionPayload);
        }
        currentMessage
          .setStatus(ChatConstant.MessageStatus.COMPLETED);

        state.isSending = false;
        return;
      case StreamingConstant.ResponseType.ERROR.value: {
        const errorMessage = message.error?.message;
        state.selectedLlmId = null;

        setErrorWidget(currentMessage, errorMessage);

        state.isSending = false;
        return;
      }
    }
  } catch (error) {
    snackbarStore.setFailure(error.message);

    setErrorWidget(currentMessage, error.message);

    state.isSending = false;
  }
};

const connectChat = async () => {
  state.isConnecting = true;
  const signal = createStartAgentSignal();

  try {
    let data, error;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await delay(1000);
      ({ data, error } = await server.agent.start({
        agentId: props.agent.id,
        sessionId: state.sessionId,
        storageId: state.storageId,
        toolRuntimeConfig: {
          ...StartAgent.buildToolRuntimeConfigPayload(state.lambdaBaseInputMap),
          ...buildToolRuntimeConfig(),
        },
      }, {
        lazy: false,
        signal,
      }));
      if (signal.aborted) return;
      if (!error.value) break;
      // Only retry transient failures (network / 5xx); 4xx fails fast.
      if (!isRetryableFetchError(error.value)) break;
    }

    if (error.value) {
      throw new Error(error.value.message);
    }

    if (!data.value) return;
    if (isUnmounted) return;

    state.sessionId = data.value.sessionId;
    if (state.shouldPersistLambdaBaseInputSession) {
      await persistLambdaBaseInputSession();
      state.shouldPersistLambdaBaseInputSession = false;
    }

    // Close existing connection before creating new one
    disconnectChat();

    state.wsClient = new LfeWebSocketClient({
      url: data.value.url,
      onMessage: handleMessage,
      onActivity: () => {
        if (state.isSending) responseStallTimer.refresh();
      },
      onClose: (e) => {
        if (!e.wasClean) {
          const lastMessage = state.messages.at(-1);
          if (lastMessage?.isRoleAssistant) {
            setErrorWidget(lastMessage, `WebSocket closed with code ${e.code}`);
          }
          snackbarStore.setFailure(`WebSocket closed with code ${e.code}`);
          state.isSending = false;
        }
      },
    });

    await state.wsClient.connect();
    // A newer connectChat may have aborted this one while connect() was in flight.
    if (signal.aborted || isUnmounted) {
      state.wsClient.close();
      return;
    }
    state.wsClient.startPing();
    // Arm the timer matching the current state: stall watchdog if a request is in flight,
    // otherwise the user-idle disconnect.
    if (state.isSending) responseStallTimer.refresh();
    else userIdleTimer.refresh();
  } catch (error) {
    if (signal.aborted) return;
    console.error(error);
    if (error.message) {
      snackbarStore.setFailure(error.message);
      snackbarStore.report(error.message);
    }
  } finally {
    if (!signal.aborted) state.isConnecting = false;
  }
};

const disconnectChat = () => {
  if (state.wsClient) {
    state.wsClient.close();
  }
};

const handleCancel = () => {
  const currentMessage = state.messages.find(({ id }) => id === state.currentMessageId);
  if (currentMessage?.isStatusPending || currentMessage?.isStatusComposing) {
    currentMessage.setStatus(ChatConstant.MessageStatus.ABORTED);
  }
  // Disconnect before reconnect so in-flight stream events can't revive the status.
  disconnectChat();
  state.isSending = false;
  connectChat();
};

// Use history.replaceState instead of router.replace: navigating index.vue → [sessionId].vue
// would unmount this component and break the in-flight WebSocket stream.
const replaceUrlWithCurrentSession = () => {
  const base = `/agents/${props.agent.id}/chat`;
  const target = state.sessionId ? `${base}/${state.sessionId}` : base;
  if (window.location.pathname === target) return;
  window.history.replaceState({}, '', target);
};

const continueChat = () => {
  chatRoomRef.value?.send(new TextContentBlock({ text: $t('__messageAnswerContinue') }));
};

const setErrorWidget = (assistantMessage, errorText, message = $t('__instructionInternalServerError')) => {
  const messageId = assistantMessage.id;
  assistantMessage
    .setWidget({
      component: ChatRoomActionPromptCard,
      props: {
        message,
        detail: errorText,
        actionLabel: $t('__actionRetry'),
        variant: 'error',
        onAction: () => chatRoomRef.value?.retry(messageId),
      },
    })
    .setStatus(ChatConstant.MessageStatus.FAILED);
};

const startNewConversation = () => {
  const lastUserMessage = [...state.messages].reverse().find(m => m.isRoleUser);
  const draft = lastUserMessage?.content?.[0]?.text?.trim();
  if (draft) {
    agentChatStore.setPendingDraft(props.agent.id, draft);
  }
  agentChatStore.restartChat();
};

const restartChat = () => {
  state.messages = [];
  state.sessionId = null;
  state.nextToken = null;
  state.isSending = false;
  state.currentMessageId = null;
  state.previousMessageId = null;
  replaceUrlWithCurrentSession();
  connectChat();
  userIdleTimer.clear();
  responseStallTimer.clear();
};

watch(() => state.storageId, (id) => {
  agentChatStore.setStorageId(id);
}, { immediate: true });

watch(() => state.sessionId, (id) => {
  agentChatStore.setCurrentSessionId(id);
}, { immediate: true });

watch(() => agentChatStore.refresh, () => {
  restartChat();
  initialInputText.value = agentChatStore.consumePendingDraft(props.agent.id) ?? draft.readInitial();
});

watch(isMcpDialogOpen, (open) => {
  if (!open) resetMcpOauth();
});

watch(mcpPendingCount, () => {
  isMcpBannerDismissed.value = false;
});

const persistPreferences = () => server.uiData.set(new UiData({
  key: AgentUserPreferences.getUiDataKey(props.agent.id, useAuthStore().parsedToken.sub),
  value: new AgentUserPreferences({
    storageId: state.storageId,
    llmId: state.selectedLlmId,
  }),
}), { lazy: false });

const handleStorageUpdate = async () => {
  await persistPreferences();
  restartChat();
};

const handleLlmUpdate = () => persistPreferences();

const loadLambdaBaseInput = async () => {
  if (!(props.agent.lambdaTools?.length > 0)) return;
  const userId = useAuthStore().parsedToken.sub;
  if (state.sessionId) {
    const key = LambdaBaseInputMap.getUiDataKeyForSession(props.agent.id, state.sessionId, userId);
    const { data } = await server.uiData.get({ key }, { lazy: false });
    if (data.value?.value) {
      state.lambdaBaseInputMap = data.value.value;
    }
    return;
  }
  const mapKey = LambdaBaseInputMap.getUiDataKeyForAgentDefault(props.agent.id, userId);
  const fingerprintKey = LambdaBaseInputMap.getUiDataKeyForSchemaFingerprint(props.agent.id, userId);
  const { data } = await server.uiData.batchGet({ keys: [mapKey, fingerprintKey] }, { lazy: false });
  const items = data.value?.data ?? [];
  const mapItem = items.find(item => item.key === mapKey);
  const fingerprintItem = items.find(item => item.key === fingerprintKey);
  if (mapItem?.value) {
    state.lambdaBaseInputMap = mapItem.value;
    state.hasSavedLambdaBaseInputDefault = true;
  }
  if (fingerprintItem?.value) {
    state.lambdaBaseInputSchemaFingerprint = fingerprintItem.value;
  }
};

const hasLambdaToolWithBaseInputSchema = computed(() => (
  (props.agent.lambdaTools ?? []).some(t => t.baseInputSchema)
));

const missingRequiredBaseInputFields = computed(() => {
  const missing = [];
  for (const tool of (props.agent.lambdaTools ?? [])) {
    const key = tool.name || 'lambda';
    const required = tool.baseInputSchema?.required ?? [];
    const filled = state.lambdaBaseInputMap[key] ?? {};
    for (const field of required) {
      if (strUtils.isEmpty(filled[field])) {
        missing.push({ toolKey: key, field });
      }
    }
  }
  return missing;
});

const hasLambdaSchemaChanged = computed(() => {
  if (!state.hasSavedLambdaBaseInputDefault) return false;
  const current = LambdaBaseInputMap.getSchemaFingerprint(props.agent.lambdaTools);
  return current !== state.lambdaBaseInputSchemaFingerprint;
});

const shouldAutoOpenLambdaConfigChip = computed(() => {
  if (state.sessionId) return false;
  if (!hasLambdaToolWithBaseInputSchema.value) return false;
  return !state.hasSavedLambdaBaseInputDefault
    || missingRequiredBaseInputFields.value.length > 0
    || hasLambdaSchemaChanged.value;
});

const lambdaConfigChipRef = ref();
const storageSelectRef = ref();

const isStorageMutable = computed(() =>
  !!props.agent?.uiConfig?.showStorageButton
  && !props.sessionId
  && state.messages.length === 0,
);

// Show "Select Storage" in the + menu only when nothing is bound yet;
// once bound, the visible chip with its own clear affordance takes over.
const canBindStorageFromMenu = computed(() => isStorageMutable.value && !state.storageId);

const hasMutableStorageChip = computed(() => isStorageMutable.value && !!state.storageId);

const hasLockedStorageChip = computed(() =>
  !!props.agent?.uiConfig?.showStorageButton
  && !isStorageMutable.value
  && !!state.storageId,
);

const hasLambdaTools = computed(() => (props.agent?.lambdaTools?.length ?? 0) > 0);

const isLambdaReadonly = computed(() => !!props.sessionId || state.messages.length > 0);

const inputMenuItems = computed(() => [
  {
    icon: 'mdi-paperclip',
    title: t('__tooltipUploadFilesOrImages'),
    disabled: state.isSending,
    onClick: () => chatRoomRef.value?.triggerFileUpload(),
  },
  canBindStorageFromMenu.value && {
    iconSrc: StorageConstant.Type.STORAGE.iconPath,
    title: t('__actionSelectStorage'),
    onClick: () => storageSelectRef.value?.open(),
  },
  hasLambdaTools.value && {
    icon: 'mdi-cog',
    title: t('__actionLambdaBaseInput'),
    onClick: () => lambdaConfigChipRef.value?.open(),
  },
].filter(Boolean));

// Strip auto-templated empties so persisted uiData stays clean and round-trip-safe.
const prunedLambdaBaseInputMap = () => {
  const pruned = {};
  for (const [toolName, baseInput] of Object.entries(state.lambdaBaseInputMap)) {
    const next = StartAgent.pruneEmptyValues(baseInput);
    if (next !== undefined) pruned[toolName] = next;
  }
  return pruned;
};

const persistLambdaBaseInputSession = () => {
  if (!state.sessionId) return null;
  return server.uiData.set(new UiData({
    key: LambdaBaseInputMap.getUiDataKeyForSession(props.agent.id, state.sessionId, useAuthStore().parsedToken.sub),
    value: prunedLambdaBaseInputMap(),
  }), { lazy: false });
};

const persistLambdaBaseInputDefault = () => {
  const userId = useAuthStore().parsedToken.sub;
  return Promise.all([
    server.uiData.set(new UiData({
      key: LambdaBaseInputMap.getUiDataKeyForAgentDefault(props.agent.id, userId),
      value: prunedLambdaBaseInputMap(),
    }), { lazy: false }),
    server.uiData.set(new UiData({
      key: LambdaBaseInputMap.getUiDataKeyForSchemaFingerprint(props.agent.id, userId),
      value: LambdaBaseInputMap.getSchemaFingerprint(props.agent.lambdaTools),
    }), { lazy: false }),
  ]);
};

const handleLambdaBaseInputUpdate = async () => {
  await persistLambdaBaseInputDefault();
  state.shouldPersistLambdaBaseInputSession = true;
  restartChat();
};

onMounted(async () => {
  await loadLambdaBaseInput();
  if (shouldAutoOpenLambdaConfigChip.value) {
    lambdaConfigChipRef.value?.open();
  }
  // In force mode the user must save before chatting; the save path runs
  // restartChat() which connects. Connecting here would just be torn down.
  if (missingRequiredBaseInputFields.value.length > 0) return;
  connectChat();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  disconnectChat();
  agentChatStore.setCurrentSessionId(null);
});
</script>

<template>
  <ChatRoom
    ref="chatRoomRef"
    :key="agentChatStore.refresh"
    v-model:messages="state.messages"
    v-model:sending="state.isSending"
    :assistant-icon="IconConstant.Base.AGENT"
    :assistant-image="props.agent?.uiConfig?.avatarImage"
    :title="props.agent?.uiConfig?.title"
    :description="props.agent?.uiConfig?.description"
    :starter-prompts="props.agent?.uiConfig?.starterPrompts"
    :input-placeholder="props.agent?.uiConfig?.inputPlaceholder"
    :initial-input-text="initialInputText"
    :has-history="!!props.sessionId && !state.isEmpty"
    hide-upload-button
    :input-footer-height="isMcpOauthBannerVisible ? 80 : 40"
    :on-load="loadMessages"
    :on-input="draft.persist"
    :on-send="sendMessage"
    :on-cancel="handleCancel"
    :on-ask-user-question-answers-submit="sendAnswers"
  >
    <template #input-left>
      <template v-if="canBindStorageFromMenu">
        <AgentChatRoomStorageSelectButton
          ref="storageSelectRef"
          v-model:storage-id="state.storageId"
          hide-activator
          @update:storage-id="handleStorageUpdate"
        />
      </template>
      <template v-if="hasLambdaTools">
        <AgentChatRoomLambdaToolConfigButton
          ref="lambdaConfigChipRef"
          v-model:lambda-base-input-map="state.lambdaBaseInputMap"
          :agent="props.agent"
          :readonly="isLambdaReadonly"
          hide-activator
          @update:lambda-base-input-map="handleLambdaBaseInputUpdate"
        />
      </template>
      <AgentChatRoomActionMenu>
        <v-list-item
          v-for="(item, i) in inputMenuItems"
          :key="i"
          :title="item.title"
          :prepend-icon="item.icon"
          :disabled="item.disabled"
          @click="item.onClick"
        >
          <template
            v-if="item.iconSrc"
            #prepend
          >
            <AppImageIcon
              :src="item.iconSrc"
              :width="20"
              :height="20"
              class="mr-4"
            />
          </template>
        </v-list-item>
      </AgentChatRoomActionMenu>
    </template>
    <template #input-bottom>
      <div class="d-flex ga-2 align-center flex-wrap">
        <template v-if="hasOauthTools">
          <AgentChatRoomMcpConnectButton
            v-model="isMcpDialogOpen"
            :oauth-mcp-tools="oauthMcpTools"
            :pending-count="mcpPendingCount"
            :get-tool-status="getToolStatus"
            :connect="connectMcpOauth"
            :is-connecting="isMcpConnecting"
            :get-error="getMcpError"
          />
        </template>
        <template v-if="hasMutableStorageChip">
          <AgentChatRoomStorageSelectButton
            v-model:storage-id="state.storageId"
            @update:storage-id="handleStorageUpdate"
          />
        </template>
        <template v-else-if="hasLockedStorageChip">
          <AgentChatRoomStorageButton
            :storage-id="state.storageId"
            :on-mutate="() => state.wsClient?.syncStorage()"
          />
        </template>
        <template v-if="props.agent?.llmIds?.length > 0">
          <AgentChatRoomLlmMenu
            v-model:selected-llm-id="state.selectedLlmId"
            :agent="props.agent"
            :notice="state.messages.length > 0 ? t('__messageLlmSwitchPerformanceWarning') : ''"
            @update:selected-llm-id="handleLlmUpdate"
          />
        </template>
      </div>
    </template>
    <template #input-footer>
      <AppAlert
        v-if="isMcpOauthBannerVisible"
        type="warning"
        variant="tonal"
        density="compact"
        rounded="xl"
        class="text-body-2 bg-backgroundScale2"
        closable
        :text="$t('__messageMcpOauthRequired', mcpPendingCount, { count: mcpPendingCount })"
        @click:close="isMcpBannerDismissed = true"
      />
      <Transition name="sync-status-fade">
        <template v-if="isSyncJobStatusCardVisible && syncJobStatus">
          <ResourceAgentLoaderSyncJobStatusCard
            :status="syncJobStatus"
            :loader-id="loaderId"
          />
        </template>
      </Transition>
    </template>
  </ChatRoom>
</template>
