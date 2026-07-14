<script setup>
import { ChatConstant, StreamingConstant } from '~/constants';
import { TextContentBlock } from '~/models/server/contentBlock';
import { ChatAnswersStreamingRequest, ChatTextStreamingRequest } from '~/models/websocket/chat';
import { LfeWebSocketClient } from '~/services/websocket';
import ChatRoomActionPromptCard from './ChatRoomActionPromptCard.vue';

/**
 * @import { ChatRoomMessage } from '~/models/ui/chatRoom'
 * @import { ChatStreamingResponse } from '~/models/websocket/chat'
 */

const props = defineProps({
  viewportHeightOffset: {
    type: Number,
    default: 0,
  },
  scrollTopOffset: {
    type: Number,
    default: 0,
  },
  fillHeight: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const server = useServer();
const snackbarStore = useSnackbarStore();
const { createSignal } = useAbortController();

let isUnmounted = false;

const chatRoomRef = ref();

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
    const currentMessage = messages.value.find(m => m.id === state.currentMessageId);
    if (currentMessage && !currentMessage.isStatusFailed) {
      setErrorWidget(currentMessage, null, t('__messageChatResponseTimeout'));
    }
    sending.value = false;
  },
});

const state = reactive({
  /**
   * @type {LfeWebSocketClient}
   */
  wsClient: null,
  isConnecting: true,
  sessionId: null,
  currentMessageId: null,
  previousMessageId: null,
});

/**
 * @type {Ref<ChatRoomMessage[]>}
 */
const messages = defineModel('messages', {
  type: Array,
  default: [],
});

const sending = defineModel('sending', {
  type: Boolean,
  default: false,
});

// One timer is armed at a time, switched by whether a request is in flight: while sending
// we watch for backend silence; between turns we watch for user inactivity.
watch(sending, (isSending) => {
  if (isSending) {
    userIdleTimer.clear();
    responseStallTimer.refresh();
  } else {
    responseStallTimer.clear();
    userIdleTimer.refresh();
  }
});

const sendMessage = async ({ contentBlocks, pendingMessageId }) => {
  sending.value = true;
  state.currentMessageId = pendingMessageId;

  try {
    if (!state.wsClient?.isConnected) {
      await connectChat();
    }
    await waitFor(() => state.isConnecting === false);
    state.wsClient.chat(new ChatTextStreamingRequest({
      content: contentBlocks,
    }));
  } catch (error) {
    snackbarStore.setFailure(error.message);
    const pendingMessage = messages.value.find(m => m.id === pendingMessageId);
    if (pendingMessage) setErrorWidget(pendingMessage, error.message);
    sending.value = false;
  }

  return false;
};

const sendAnswers = async ({ qaPairs, pendingMessageId }) => {
  sending.value = true;
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
    const pendingMessage = messages.value.find(m => m.id === pendingMessageId);
    if (pendingMessage) setErrorWidget(pendingMessage, error.message);
    sending.value = false;
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

  const currentMessage = messages.value.find(findCurrentById);
  if (!currentMessage) return;
  if (currentMessage.isStatusFailed) return;

  try {
    switch (message.responseType) {
      case StreamingConstant.ResponseType.START.value:
        return;
      case StreamingConstant.ResponseType.DATA.value:
        switch (message.event.eventType) {
          case StreamingConstant.EventType.CONTENT_BLOCK_START.value:
            state.previousMessageId = state.currentMessageId;
            downgradeContentToThinkingSteps(messages.value.find(findPreviousById));
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
                    message: t('__messageAgentMaxTurnsReached'),
                    actionLabel: t('__actionNewChat'),
                    onAction: restartChat,
                  },
                })
                .setStatus(ChatConstant.MessageStatus.COMPLETED);

              sending.value = false;
              return;
            }
            if (message.event.stopReason === StreamingConstant.StopReason.MAX_ITERATIONS_REACHED.value) {
              currentMessage
                .setWidget({
                  component: ChatRoomActionPromptCard,
                  props: {
                    message: t('__messageAgentMaxIterationsReached'),
                    actionLabel: t('__actionContinue'),
                    onAction: continueChat,
                  },
                })
                .setStatus(ChatConstant.MessageStatus.COMPLETED);

              sending.value = false;
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

        sending.value = false;
        return;
      case StreamingConstant.ResponseType.ERROR.value: {
        const errorMessage = message.error?.message;

        setErrorWidget(currentMessage, errorMessage);

        sending.value = false;
        return;
      }
    }
  } catch (error) {
    snackbarStore.setFailure(error.message);

    setErrorWidget(currentMessage, error.message);

    sending.value = false;
  }
};

const connectChat = async () => {
  state.isConnecting = true;
  const signal = createSignal();

  try {
    let data, error;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await delay(1000);
      ({ data, error } = await server.copilot.startHqCopilotAgent({
        sessionId: state.sessionId,
      }, {
        lazy: false,
        signal,
      }));
      if (signal.aborted) return;
      if (!error.value) break;
      // Only retry transient failures (network / 5xx); 4xx (e.g. 403 group, 422) fails fast.
      if (!isRetryableFetchError(error.value)) break;
    }

    if (error.value) {
      throw new Error(error.value.message);
    }

    if (!data.value) return;
    if (isUnmounted) return;

    state.sessionId = data.value.sessionId;

    // Close existing connection before creating new one
    disconnectChat();

    state.wsClient = new LfeWebSocketClient({
      url: data.value.url,
      onMessage: handleMessage,
      onActivity: () => {
        if (sending.value) responseStallTimer.refresh();
      },
      onClose: (e) => {
        if (!e.wasClean) {
          const lastMessage = messages.value.at(-1);
          if (lastMessage?.isRoleAssistant) {
            setErrorWidget(lastMessage, `WebSocket closed with code ${e.code}`);
          }
          snackbarStore.setFailure(`WebSocket closed with code ${e.code}`);
          sending.value = false;
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
    if (sending.value) responseStallTimer.refresh();
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
  const currentMessage = messages.value.find(({ id }) => id === state.currentMessageId);
  if (currentMessage?.isStatusPending || currentMessage?.isStatusComposing) {
    currentMessage.setStatus(ChatConstant.MessageStatus.ABORTED);
  }
  // Disconnect before reconnect so in-flight stream events can't revive the status.
  disconnectChat();
  sending.value = false;
  connectChat();
};

const continueChat = () => {
  chatRoomRef.value?.send(new TextContentBlock({ text: t('__messageAnswerContinue') }));
};

const setErrorWidget = (assistantMessage, errorText, message = t('__instructionInternalServerError')) => {
  const messageId = assistantMessage.id;
  assistantMessage
    .setWidget({
      component: ChatRoomActionPromptCard,
      props: {
        message,
        detail: errorText,
        actionLabel: t('__actionRetry'),
        variant: 'error',
        onAction: () => chatRoomRef.value?.retry(messageId),
      },
    })
    .setStatus(ChatConstant.MessageStatus.FAILED);
};

const restartChat = () => {
  // Drop the current session so the copilot starts a fresh, empty conversation.
  state.sessionId = null;
  state.currentMessageId = null;
  state.previousMessageId = null;
  sending.value = false;
  disconnectChat();
  connectChat();
  responseStallTimer.clear();
  userIdleTimer.refresh();
};

onMounted(() => {
  connectChat();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  disconnectChat();
});

defineExpose({
  handleCancel,
  restartChat,
});
</script>

<template>
  <ChatRoom
    ref="chatRoomRef"
    v-model:messages="messages"
    v-model:sending="sending"
    :viewport-height-offset="props.viewportHeightOffset"
    :fill-height="props.fillHeight"
    :on-send="sendMessage"
    :on-cancel="handleCancel"
    :on-ask-user-question-answers-submit="sendAnswers"
  >
    <template
      v-if="$slots['input-bottom']"
      #input-bottom
    >
      <slot name="input-bottom" />
    </template>
  </ChatRoom>
</template>
