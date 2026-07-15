<script setup>
import * as ChatConstant from '~/constants/ChatConstant';
import { TextContentBlock } from '~/models/server/contentBlock';
import ChatRoomActionPromptCard from './ChatRoomActionPromptCard.vue';

/**
 * Dashboard copilot chat wired to the Bedrock AgentCore runtime (ym_genbi_agent):
 * fetches a Cognito client_credentials token (no user login), POSTs the prompt to
 * the runtime's invocation endpoint, and streams the SSE response into the shared
 * ChatRoom component (markdown rendering and styling unchanged).
 *
 * @import { ChatRoomMessage } from '~/models/ui/chatRoom'
 */

const props = defineProps({
  fillHeight: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  inputPlaceholder: {
    type: String,
    default: '',
  },
  backgroundColor: {
    type: String,
    default: 'background',
  },
  hideUploadButton: {
    type: Boolean,
    default: false,
  },
});

// Welcome copy — hardcoded (previously fetched from the platform agent ui_config).
const COPILOT_TITLE = '您好，我是船舶效能分析助理';
const COPILOT_DESCRIPTION = '可以用自然語言查詢船隊效能資料湖：速度損失 (speed loss) 趨勢、CII 評級、異常預警、'
  + '維修建議與成本效益等。';
// Rendered by ChatRoom as clickable suggestion chips (joined to its
// newline-separated prop format below).
const COPILOT_STARTER_PROMPTS = [
  '過去一年船隊因船體污損多花了多少燃油成本？',
  '全船隊目前速度損失最嚴重的是哪三艘船？',
  '哪些維修建議的淨節省最高？該優先安排哪幾艘？',
  '有哪些船的 CII 評級有退步到 D 或 E 的風險？',
  'S1 的 slip 趨勢如何？最近一次維修後有改善嗎？',
];

const {
  agentcoreRuntimeArn,
  agentcoreRegion,
  agentcoreTokenEndpoint,
  agentcoreClientId,
  agentcoreClientSecret,
  agentcoreTokenScope,
} = useRuntimeConfig().public;
const { t } = useI18n();
const snackbarStore = useSnackbarStore();

let isUnmounted = false;

const chatRoomRef = ref();

const responseStallTimer = useIdleTimer({
  timeout: ChatConstant.ConnectionTimeout.RESPONSE_STALL,
  onTimeout: () => {
    abortStream();
    const currentMessage = messages.value.find(m => m.id === state.currentMessageId);
    if (currentMessage && !currentMessage.isStatusFailed) {
      setErrorWidget(currentMessage, null, t('__messageChatResponseTimeout'));
    }
    sending.value = false;
  },
});

const state = reactive({
  currentMessageId: null,
});

// Owned by the panel (survives this component unmounting on panel close) so a
// reopened panel keeps its transcript AND its agent-side multi-turn context.
const sessionId = defineModel('sessionId', {
  type: String,
  default: null,
});

/**
 * @type {AbortController|null}
 */
let streamAbortController = null;

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

watch(sending, (isSending) => {
  if (isSending) responseStallTimer.refresh();
  else responseStallTimer.clear();
});

const displayTitle = computed(() => props.title || COPILOT_TITLE);
const displayDescription = computed(() => props.description || COPILOT_DESCRIPTION);
const displayInputPlaceholder = computed(() => props.inputPlaceholder);
const displayStarterPrompts = computed(() => COPILOT_STARTER_PROMPTS.join('\n'));

// ---- Cognito M2M token: cached, refreshed transparently before expiry -------
const tokenCache = reactive({ token: null, expiresAt: 0 });

const getAccessToken = async () => {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  if (!agentcoreTokenEndpoint || !agentcoreClientId || !agentcoreClientSecret) {
    throw new Error('Missing AGENTCORE_TOKEN_ENDPOINT / AGENTCORE_CLIENT_ID / AGENTCORE_CLIENT_SECRET');
  }
  let response;
  try {
    response = await $fetch(agentcoreTokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: agentcoreClientId,
        client_secret: agentcoreClientSecret,
        scope: agentcoreTokenScope,
      }).toString(),
    });
  } catch (error) {
    // ofetch's message is only `[POST] "<url>": 400` — Cognito puts the actual
    // reason (invalid_client, invalid_scope) in the JSON body.
    const reason = error?.data?.error_description ?? error?.data?.error ?? error.message;
    throw new Error(`Cognito token request failed (${error?.status ?? '?'}): ${reason}`);
  }
  tokenCache.token = response.access_token;
  tokenCache.expiresAt = Date.now() + response.expires_in * 1000;
  return tokenCache.token;
};

// ---- AgentCore invocation (SSE streaming) -----------------------------------
const invokeUrl = computed(() => {
  const arn = encodeURIComponent(agentcoreRuntimeArn || '');
  return `https://bedrock-agentcore.${agentcoreRegion}.amazonaws.com/runtimes/${arn}/invocations?qualifier=DEFAULT`;
});

// Runtime session ids must be ≥33 chars; one id per conversation keeps
// multi-turn context on the agent side.
const ensureSessionId = () => {
  // NOTE: with a parent v-model binding, reading a defineModel right after
  // writing it still returns the OLD prop value (the update flows back on the
  // parent's next render) — so return the local variable, never the model.
  let id = sessionId.value;
  if (!id) {
    id = `ym-copilot-${crypto.randomUUID()}${crypto.randomUUID()}`;
    sessionId.value = id;
  }
  return id;
};

const extractPromptText = contentBlocks => contentBlocks
  .map(block => block?.text)
  .filter(Boolean)
  .join('\n');

/**
 * Consume one SSE chunk payload into the pending assistant message: strings are
 * text deltas; `{tool}` objects surface tool progress as a thinking step.
 */
const applyStreamChunk = (currentMessage, chunk) => {
  if (typeof chunk === 'string') {
    if (!currentMessage.latestContentBlock) {
      currentMessage
        .pushContentBlock(new TextContentBlock({ text: '' }))
        .setStatus(ChatConstant.MessageStatus.COMPOSING);
    }
    currentMessage.appendLatestContentBlockText(chunk);
    return;
  }
  if (chunk && typeof chunk === 'object') {
    if (chunk.tool) {
      currentMessage
        .downgradeContentToThinkingSteps()
        .pushThinkingStep(new TextContentBlock({ text: `🔍 ${chunk.tool}` }));
      return;
    }
    if (chunk.error) {
      throw new Error(chunk.error);
    }
  }
};

const streamInvoke = async ({ prompt, currentMessage, signal }) => {
  const token = await getAccessToken();
  const response = await fetch(invokeUrl.value, {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': ensureSessionId(),
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    // A locally-"valid" token can still be rejected server-side (rotated client,
    // changed scope) — drop it so the retry path fetches a fresh one.
    if (response.status === 401 || response.status === 403) {
      tokenCache.token = null;
      tokenCache.expiresAt = 0;
    }
    throw new Error(`AgentCore invoke failed (${response.status}): ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const applyFrames = (frames) => {
    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        let chunk;
        try {
          chunk = JSON.parse(line.slice(6));
        } catch {
          chunk = line.slice(6);
        }
        applyStreamChunk(currentMessage, chunk);
      }
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    responseStallTimer.refresh();
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; each `data:` line is one chunk.
    const frames = buffer.split('\n\n');
    buffer = frames.pop();
    applyFrames(frames);
  }
  // The stream can end without the trailing blank line that would have closed the last frame,
  // which would strand it in the buffer. Flush the decoder and apply whatever is left.
  buffer += decoder.decode();
  if (buffer.trim()) applyFrames([buffer]);
};

const sendMessage = async ({ contentBlocks, pendingMessageId }) => {
  sending.value = true;
  state.currentMessageId = pendingMessageId;
  const currentMessage = messages.value.find(m => m.id === pendingMessageId);

  // Local reference: abortStream() nulls the module-level variable before the
  // AbortError rejection lands here, so the catch must test THIS controller.
  const controller = new AbortController();
  streamAbortController = controller;

  try {
    // The agent accepts text only — image attachments would be silently lost.
    if (contentBlocks.some(block => block?.data || block?.url)) {
      snackbarStore.setFailure('此助理僅支援文字內容，圖片附件不會傳送給助理');
    }
    const prompt = extractPromptText(contentBlocks);
    if (!prompt) {
      currentMessage?.setStatus(ChatConstant.MessageStatus.ABORTED);
      snackbarStore.setFailure('請輸入文字問題');
      return false;
    }

    await streamInvoke({
      prompt,
      currentMessage,
      signal: controller.signal,
    });

    if (isUnmounted) return false;
    if (!currentMessage.isStatusFailed && !currentMessage.isStatusAborted) {
      currentMessage.setStatus(ChatConstant.MessageStatus.COMPLETED);
    }
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError' || isUnmounted) return false;
    snackbarStore.setFailure(error.message);
    // Don't clobber a widget already set (e.g. the stall-timeout card).
    if (currentMessage && !currentMessage.isStatusFailed) setErrorWidget(currentMessage, error.message);
  } finally {
    if (streamAbortController === controller) streamAbortController = null;
    sending.value = false;
  }

  return false;
};

const abortStream = () => {
  streamAbortController?.abort();
  streamAbortController = null;
};

const handleCancel = () => {
  const currentMessage = messages.value.find(({ id }) => id === state.currentMessageId);
  if (currentMessage?.isStatusPending || currentMessage?.isStatusComposing) {
    currentMessage.setStatus(ChatConstant.MessageStatus.ABORTED);
  }
  abortStream();
  sending.value = false;
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
  abortStream();
  sessionId.value = null;
  state.currentMessageId = null;
  sending.value = false;
  responseStallTimer.clear();
};

onBeforeUnmount(() => {
  isUnmounted = true;
  abortStream();
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
    :fill-height="props.fillHeight"
    :title="displayTitle"
    :description="displayDescription"
    :starter-prompts="displayStarterPrompts"
    :input-placeholder="displayInputPlaceholder"
    :background-color="props.backgroundColor"
    :hide-upload-button="props.hideUploadButton"
    hide-default-greeting
    :enable-server-file-parsing="false"
    :on-send="sendMessage"
    :on-cancel="handleCancel"
  />
</template>
