<script setup>
import * as ChatConstant from '~/constants/ChatConstant';
import * as IconConstant from '~/constants/IconConstant';
import { TextContentBlock } from '~/models/server/contentBlock';
import { AssistantChatRoomMessage, UserChatRoomMessage } from '~/models/ui/chatRoom';
import chatUtils from '~/utils/chatUtils';
import AppProgressCircular from './AppProgressCircular.vue';

/**
 * @import { ChatRoomMessage } from '~/models/ui/chatRoom'
 */

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  starterPrompts: {
    type: String,
    default: '',
  },
  backgroundColor: {
    type: String,
    default: 'background',
  },
  assistantIcon: {
    type: String,
    default: IconConstant.Base.ASSISTANT,
  },
  assistantImage: {
    type: String,
    default: null,
  },
  inputPlaceholder: {
    type: String,
    default: '',
  },
  inputFooterHeight: {
    type: Number,
    default: 40,
  },
  initialInputText: {
    type: String,
    default: '',
  },
  showCopyButton: {
    type: Boolean,
    default: true,
  },
  showReadAloudButton: {
    type: Boolean,
    default: true,
  },
  viewportHeightOffset: {
    type: Number,
    default: 0,
  },
  // When the chat is embedded in a fixed-height container (e.g. a slide panel)
  // rather than the full page, fill the container's height instead of computing
  // it from 100dvh and the page header/footer.
  fillHeight: {
    type: Boolean,
    default: false,
  },
  hasHistory: {
    type: Boolean,
    default: false,
  },
  hideDefaultGreeting: {
    type: Boolean,
    default: false,
  },
  onLoad: {
    type: Function,
    default: () => {},
  },
  onInput: {
    type: Function,
    default: () => {},
  },
  onSend: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
  onAskUserQuestionAnswersSubmit: {
    type: Function,
    default: () => {},
  },
  hideUploadButton: {
    type: Boolean,
    default: false,
  },
  enableServerFileParsing: {
    type: Boolean,
    default: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const SCROLL_UP_THRESHOLD = 160;
const SCROLL_TO_BOTTOM_BUTTON_OFFSET = 40;
const MAX_STARTER_PROMPTS = 5;

const display = useDisplay();

const messageContainerRef = ref();
const messageContainerRef2 = ref();
const messageInputContainerRef = ref();
const messageInputRef = ref();

const state = reactive({
  hasScrolledUp: false,
  // Readonly transcripts open pinned to the bottom and stay there as late content
  // (images, charts, fonts) grows — until the user scrolls themselves.
  autoStickToBottom: props.readonly,
  headerHeight: 0,
  footerHeight: 0,
  // Measured height of the scroll viewport when fillHeight is on.
  containerHeight: 0,
  initialInputContainerHeight: 0,
  inputContainerHeight: 0,
  inputContainerResizeObserver: null,
  contentResizeObserver: null,
  showReferenceDrawer: false,
  selectedReferenceIndex: null,
  selectedMessageId: null,
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

const isInitial = computed(() => messages.value.length === 0);

const parsedStarterPrompts = computed(() => {
  if (!props.starterPrompts) return [];
  const all = props.starterPrompts
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (all.length <= MAX_STARTER_PROMPTS) return all;
  // Shuffle so users see a different sample each chat-room visit.
  return arrUtils.shuffle(all).slice(0, MAX_STARTER_PROMPTS);
});

const latestUserMessageElement = computed(() => {
  if (!messageContainerRef.value) return;
  const { $el } = messageContainerRef.value;
  const userMessages = $el.querySelectorAll('.user-message');
  return messages.value.length >= 2 ? userMessages[userMessages.length - 1] : null;
});

const calculateAssistantMessageMinHeight = (index) => {
  // Readonly transcripts have no streaming answer to reserve space for; the
  // full-viewport min-height would only add trailing blank space that leaves
  // scroll-to-bottom parked below the last message (looks like mid-conversation).
  if (props.readonly) return 0;
  if (index < messages.value.length - 1) return 0;
  const userMessageHeight = latestUserMessageElement.value?.offsetHeight || 0;
  // viewport height - user message height - scroll intersect - message margin - input container height
  if (props.fillHeight) {
    return `calc(${state.containerHeight}px - ${userMessageHeight}px - 1px - 48px - ${state.inputContainerHeight}px)`;
  }
  // 100dvh - user message height - scroll intersect - message margin - input container height - header height - footer height
  return `calc(100dvh - ${userMessageHeight}px - 1px - 48px - ${state.inputContainerHeight}px - ${state.headerHeight}px - ${state.footerHeight}px - ${props.viewportHeightOffset}px)`;
};

const scrollToLatestUserMessage = useThrottleFn(async ({ behavior = 'smooth' } = {}) => {
  // Wait for DOM updates before scrolling
  await nextTick();
  if (!messageContainerRef.value) return;
  const { $el } = messageContainerRef.value;
  if (!latestUserMessageElement.value) return;
  const containerRect = $el.getBoundingClientRect();
  const elementRect = latestUserMessageElement.value.getBoundingClientRect();
  const targetScrollTop = Math.max(0, $el.scrollTop + (elementRect.top - containerRect.top));
  scrollUtils.scrollTo({
    top: targetScrollTop,
    behavior,
    target: $el,
  });
}, 10);

const scrollToBottom = () => {
  if (!messageContainerRef.value) return;
  const { $el } = messageContainerRef.value;
  scrollUtils.scrollTo({
    top: $el.scrollHeight,
    target: $el,
  });
};

const scrollToTop = () => {
  if (!messageContainerRef.value) return;
  const { $el } = messageContainerRef.value;
  scrollUtils.scrollTo({
    top: 0,
    behavior: 'auto',
    target: $el,
  });
};

// In readonly transcripts, late layout growth (images/charts decoding, web fonts)
// lands after the initial scroll-to-bottom and would otherwise leave the view
// parked mid-history. Re-pin to the bottom as content grows until the user takes
// over scrolling. The gate is a real user gesture, not a scroll-position guess —
// async growth can itself emit a scroll event (anchoring) and falsely look like
// the user scrolled up.
const stickToBottomIfNeeded = () => {
  if (!state.autoStickToBottom) return;
  scrollToBottom();
};

const releaseAutoStickToBottom = () => {
  state.autoStickToBottom = false;
};

const handleLoad = ({ side, done }) => {
  const el = messageContainerRef.value.$el;
  const prevScrollSize = el.scrollHeight;
  props.onLoad({
    side,
    done: async (status) => {
      done(status);
      // Compensate for Vuetify skipping scrollTop adjustment on 'empty', which it only does for 'ok'
      if (status === 'empty') {
        await nextTick();
        el.scrollTop += el.scrollHeight - prevScrollSize;
      }
    },
  });
};

const handleMessageContainerScroll = () => {
  if (!messageContainerRef.value) return;
  const { scrollHeight, scrollTop, clientHeight } = messageContainerRef.value.$el;
  state.hasScrolledUp = scrollHeight - scrollTop - clientHeight > SCROLL_UP_THRESHOLD;
};

const handleMessageContainerResize = async () => {
  await nextTick();
  if (props.fillHeight && messageContainerRef.value) {
    state.containerHeight = messageContainerRef.value.$el.clientHeight;
  }
  if (!messageInputContainerRef.value) return;
  state.inputContainerHeight = messageInputContainerRef.value.scrollHeight;
};

const handleInput = (text) => {
  handleMessageContainerResize();
  props.onInput(text);
};

const latestAssistantMessage = computed(() => messages.value.filter(v => v.isRoleAssistant).at(-1));

const citedReferences = computed(() => {
  if (!state.selectedMessageId) return [];
  const targetMessage = messages.value.find(({ id }) => id === state.selectedMessageId);
  if (!targetMessage) return [];
  const allRetrieval = targetMessage.content?.flatMap(contentBlock => contentBlock.toolResults?.retrieval ?? []) ?? [];
  if (!allRetrieval.length) return [];

  // Prefer extracting cited indices from message text over the backend `cited` flag, which is currently unreliable
  const citedIndices = (targetMessage.content ?? []).reduce((acc, contentBlock) => {
    for (const index of chatUtils.extractReferencedIndices(contentBlock.text)) acc.add(index);
    return acc;
  }, new Set());

  // Fall back to the backend `cited` flag if no indices were found in the text
  if (citedIndices.size === 0) return allRetrieval.filter(result => result.cited);
  return allRetrieval.filter(result => citedIndices.has(result.index));
});

const send = async (contentBlocks) => {
  const normalizedContentBlocks = Array.isArray(contentBlocks) ? contentBlocks : [contentBlocks].filter(Boolean);
  if (normalizedContentBlocks.length < 1) return;

  const userMessage = new UserChatRoomMessage({
    content: normalizedContentBlocks,
    status: ChatConstant.MessageStatus.COMPLETED,
  });
  messages.value.push(userMessage);

  scrollToLatestUserMessage();
  state.inputContainerHeight = state.initialInputContainerHeight;
  focusInput();

  const assistantMessage = new AssistantChatRoomMessage({
    status: ChatConstant.MessageStatus.PENDING,
  });
  messages.value.push(assistantMessage);

  try {
    return await props.onSend({
      contentBlocks: normalizedContentBlocks,
      pendingMessageId: assistantMessage.id,
    });
  } catch (error) {
    messages.value
      .find(item => item.id === assistantMessage.id)
      .setStatus(ChatConstant.MessageStatus.FAILED);
    throw error;
  }
};

const handleStarterPromptClick = (text) => {
  send(new TextContentBlock({ text }));
};

const submitAskUserQuestionAnswers = async ({ messageId, items }) => {
  const sourceMessage = messages.value.find(m => m.id === messageId);
  if (!sourceMessage) return;

  sourceMessage.setAskUserQuestionSubmitted(true);

  const qaPairs = items.map(item => ({
    question: item.question,
    answer: item.backendAnswer,
  }));

  const answers = items.map(item => ({
    header: item.header,
    selections: item.selections,
    text: item.text,
  }));

  const userMessage = new UserChatRoomMessage({
    answers,
    status: ChatConstant.MessageStatus.COMPLETED,
  });
  messages.value.push(userMessage);

  scrollToLatestUserMessage();

  const assistantMessage = new AssistantChatRoomMessage({
    status: ChatConstant.MessageStatus.PENDING,
  });
  messages.value.push(assistantMessage);

  try {
    return await props.onAskUserQuestionAnswersSubmit({
      qaPairs,
      pendingMessageId: assistantMessage.id,
    });
  } catch (error) {
    messages.value
      .find(item => item.id === assistantMessage.id)
      .setStatus(ChatConstant.MessageStatus.FAILED);
    throw error;
  }
};

const retry = async (assistantMessageId) => {
  const index = messages.value.findIndex(({ id }) => id === assistantMessageId);
  if (index < 1) return;
  const userMessage = messages.value.at(index - 1);
  const assistantMessage = messages.value.at(index);
  const contentBlocks = userMessage.content;
  assistantMessage.resetToPending();
  scrollToLatestUserMessage();
  try {
    return await props.onSend({
      contentBlocks,
      pendingMessageId: assistantMessage.id,
    });
  } catch (error) {
    assistantMessage.setStatus(ChatConstant.MessageStatus.FAILED);
    throw error;
  }
};

const focusInput = () => {
  if (!display.mobile.value) {
    messageInputRef.value.focus();
  }
};

const handleReferenceClick = ({ messageId, index }) => {
  state.selectedMessageId = messageId;
  state.selectedReferenceIndex = index;
  state.showReferenceDrawer = true;
};

// On first load, position the conversation. In readonly (transcript) mode land at the
// very bottom (newest message) — scrolling up then loads older messages. In live chat,
// pin the latest user message to the top so the streaming answer is visible below it.
watch(messages, async () => {
  if (props.readonly) {
    await nextTick();
    scrollToBottom();
    return;
  }
  scrollToLatestUserMessage({ behavior: 'auto' });
}, {
  once: true,
  deep: true,
});

// Prevent the first assistant response from shifting the scroll target
watch(() => latestAssistantMessage.value?.thinkingSteps?.length, () => {
  // In readonly transcripts there is no streaming answer to keep in view, and
  // this would fight the initial scroll-to-bottom on first load.
  if (props.readonly) return;
  scrollToLatestUserMessage({ behavior: 'auto' });
});

onMounted(async () => {
  state.headerHeight = document.querySelector('header')?.scrollHeight || 0;
  state.footerHeight = document.querySelector('footer')?.scrollHeight || 0;
  state.initialInputContainerHeight = messageInputContainerRef.value.scrollHeight;
  state.inputContainerResizeObserver = new ResizeObserver(handleMessageContainerResize);
  state.inputContainerResizeObserver.observe(messageInputContainerRef.value);
  window.addEventListener('resize', handleMessageContainerResize);
  handleMessageContainerResize();
  handleMessageContainerScroll();
  // v-infinite-scroll with side="start" parks initial scrollTop at the bottom;
  // for the empty greeting state we want the top of the copy visible instead.
  // Wait a frame after nextTick so we run after v-infinite-scroll's own scroll positioning.
  if (isInitial.value && !props.hasHistory) {
    await nextTick();
    requestAnimationFrame(scrollToTop);
  }
  if (props.readonly && messageContainerRef2.value?.$el) {
    state.contentResizeObserver = new ResizeObserver(stickToBottomIfNeeded);
    state.contentResizeObserver.observe(messageContainerRef2.value.$el);
    const scrollEl = messageContainerRef.value?.$el;
    scrollEl?.addEventListener('wheel', releaseAutoStickToBottom, { passive: true });
    scrollEl?.addEventListener('touchmove', releaseAutoStickToBottom, { passive: true });
  }
});

onBeforeUnmount(() => {
  state.inputContainerResizeObserver?.disconnect();
  state.contentResizeObserver?.disconnect();
  const scrollEl = messageContainerRef.value?.$el;
  scrollEl?.removeEventListener('wheel', releaseAutoStickToBottom);
  scrollEl?.removeEventListener('touchmove', releaseAutoStickToBottom);
  window.removeEventListener('resize', handleMessageContainerResize);
});

const triggerFileUpload = () => {
  messageInputRef.value?.triggerFileUpload();
};

defineExpose({
  focusInput,
  send,
  retry,
  triggerFileUpload,
});
</script>

<template>
  <AppSlidePanelContainer
    :is-panel-open="state.showReferenceDrawer"
    :panel-width="400"
    :fill-height="props.fillHeight"
  >
    <v-infinite-scroll
      ref="messageContainerRef"
      v-scroll.self="handleMessageContainerScroll"
      :height="props.fillHeight ? '100%' : `calc(100dvh - ${state.headerHeight}px - ${state.footerHeight}px - ${props.viewportHeightOffset}px)`"
      side="start"
      @load="handleLoad"
    >
      <v-container
        ref="messageContainerRef2"
        :max-width="display.thresholds.value.md"
        :class="{
          'h-100': isInitial,
          'justify-end': props.hasHistory,
        }"
        class="d-flex flex-column py-0"
      >
        <div :class="{ 'my-auto': !props.hasHistory && isInitial }">
          <v-fade-transition mode="out-in">
            <template v-if="!props.hasHistory && isInitial">
              <v-sheet
                :min-height="100"
                color="transparent"
                class="greeting d-flex flex-column align-center justify-end my-6"
              >
                <p
                  v-if="props.title || !props.hideDefaultGreeting"
                  class="title font-weight-bold mb-6"
                >
                  {{ props.title || $t('__instructionChatRoomGreeting') }}
                </p>
                <template v-if="props.description">
                  <AppMarkdown :text="props.description" />
                </template>
                <template v-if="parsedStarterPrompts.length > 0">
                  <div class="starter-prompts d-flex flex-row flex-wrap justify-center ga-2 mt-6">
                    <AppChip
                      v-for="(prompt, i) in parsedStarterPrompts"
                      :key="i"
                      :text="prompt"
                      class="starter-prompt"
                      @click="handleStarterPromptClick(prompt)"
                    />
                  </div>
                </template>
              </v-sheet>
            </template>
          </v-fade-transition>
          <v-row no-gutters>
            <template
              v-for="(message, i) in messages"
              :key="message.id"
            >
              <v-col
                :cols="12"
                :class="`${message.role}-message`"
              >
                <template v-if="message.isRoleAssistant">
                  <ChatMessageBubbleAssistant
                    :message="message"
                    :icon="props.assistantIcon"
                    :assistant-image="props.assistantImage"
                    :min-height="calculateAssistantMessageMinHeight(i)"
                    :show-copy-button="props.showCopyButton"
                    :show-read-aloud-button="props.showReadAloudButton"
                    :show-retry-button="message.isStatusFailed && i === messages.length - 1 && !message.widget"
                    :on-retry="() => retry(message.id)"
                    :on-reference-click="(index) => handleReferenceClick({ messageId: message.id, index })"
                    :on-ask-user-question-answers-submit="submitAskUserQuestionAnswers"
                  />
                </template>
                <template v-else-if="message.isRoleUser">
                  <ChatMessageBubbleUser :message="message" />
                </template>
              </v-col>
            </template>
          </v-row>
          <v-sheet
            color="transparent"
            class="position-sticky bottom-0 z-index-1"
          >
            <div class="d-flex align-center justify-center pointer-events-none">
              <v-sheet
                :style="{
                  bottom: `${state.inputContainerHeight + SCROLL_TO_BOTTOM_BUTTON_OFFSET}px`,
                }"
                color="transparent"
                class="position-absolute d-flex align-center justify-center"
              >
                <v-fade-transition mode="out-in">
                  <div
                    v-if="state.hasScrolledUp"
                    class="position-absolute pointer-events-auto"
                  >
                    <AppIconButton
                      :elevation="5"
                      color="primary"
                      class="z-index-1"
                      icon-size="large"
                      icon="mdi-arrow-down"
                      @click="scrollToBottom"
                    />
                  </div>
                </v-fade-transition>
              </v-sheet>
            </div>
            <div
              ref="messageInputContainerRef"
              class="input-wrapper relative"
              :class="`bg-${props.backgroundColor}`"
            >
              <template v-if="!props.readonly">
                <v-sheet
                  class="d-flex flex-column ga-2 rounded-xl overflow-auto pa-6 pt-1"
                  border
                >
                  <ChatMessageInput
                    ref="messageInputRef"
                    v-model:sending="sending"
                    :initial-text="props.initialInputText"
                    :on-cancel="props.onCancel"
                    :on-input="handleInput"
                    :on-send="send"
                    :placeholder="props.inputPlaceholder || $t('__actionAskQuestion')"
                    :hide-upload-button="props.hideUploadButton"
                    :enable-server-file-parsing="props.enableServerFileParsing"
                  >
                    <template
                      v-if="$slots['input-left']"
                      #prepend
                    >
                      <slot name="input-left" />
                    </template>
                    <template
                      v-if="$slots['input-append-inner']"
                      #append-inner
                    >
                      <slot name="input-append-inner" />
                    </template>
                    <template
                      v-if="$slots['input-bottom']"
                      #input-bottom
                    >
                      <slot name="input-bottom" />
                    </template>
                  </ChatMessageInput>
                </v-sheet>
                <v-sheet
                  :height="props.inputFooterHeight"
                  :color="props.backgroundColor"
                  class="d-flex align-center justify-center text-caption"
                >
                  <template v-if="$slots['input-footer']">
                    <slot name="input-footer" />
                  </template>
                </v-sheet>
              </template>
            </div>
          </v-sheet>
          <template v-if="!props.hasHistory && isInitial">
            <v-sheet
              :height="200"
              color="transparent"
            />
          </template>
        </div>
      </v-container>
      <template #empty />
      <template #loading>
        <template v-if="props.hasHistory">
          <AppProgressCircular />
        </template>
      </template>
    </v-infinite-scroll>
    <template #panel="p">
      <ChatRoomReferencePanel
        v-model="state.showReferenceDrawer"
        v-bind="p"
        :references="citedReferences"
        :message-id="state.selectedMessageId"
        :selected-reference-index="state.selectedReferenceIndex"
        :on-reference-click="(index) => state.selectedReferenceIndex = index"
      />
    </template>
  </AppSlidePanelContainer>
</template>

<style lang="scss" scoped>
.v-infinite-scroll--vertical {
  scrollbar-gutter: stable both-edges;
}
.v-container {
  color: rgba(var(--v-theme-text));
}
.input-wrapper {
  border-radius: 24px 24px 0 0;
  .v-sheet {
    background-color: rgba(var(--v-theme-backgroundScale2));
  }
}
.starter-prompts {
  max-width: 100%;
}
.starter-prompt {
  max-width: 100%;
}
:deep() {
  .greeting {
    .title {
      font-size: 28px;
    }
    h1, h2, h3, h4, h5, h6, p {
      text-align: center;
    }
    h1 {
      border-bottom: none;
    }
  }
  .markdown {
    > div > *:first-child {
      margin-top: 0;
    }
  }
}
</style>
