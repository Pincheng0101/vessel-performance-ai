<script setup>
import * as StreamingConstant from '~/constants/StreamingConstant';
import { ChatRoomMessage } from '~/models/ui/chatRoom';
import chatUtils from '~/utils/chatUtils';
import markdownScriptPreviewUtils, { RESIZE_MESSAGE_TYPE, SCRIPT_PREVIEW_IFRAME_CLASS } from '~/utils/markdownScriptPreviewUtils';

const props = defineProps({
  message: {
    type: ChatRoomMessage,
    required: true,
  },
  icon: {
    type: String,
    default: 'mdi-robot',
  },
  assistantImage: {
    type: String,
    default: null,
  },
  showCopyButton: {
    type: Boolean,
    default: true,
  },
  showReadAloudButton: {
    type: Boolean,
    default: true,
  },
  showRetryButton: {
    type: Boolean,
    default: true,
  },
  onRetry: {
    type: Function,
    default: () => {},
  },
  onReferenceClick: {
    type: Function,
    default: () => {},
  },
  onAskUserQuestionAnswersSubmit: {
    type: Function,
    default: () => {},
  },
});

const handleSubmitAskUserQuestionAnswers = (items) => {
  props.onAskUserQuestionAnswersSubmit({ messageId: props.message.id, items });
};

const { markdownScriptPreviewInjector, toMarkdownWithScriptPreviewPlaceholders } = useMarkdownScriptPreview();

const toAssistantMarkdownText = (text) => {
  return chatUtils.toReferenceLinks(toMarkdownWithScriptPreviewPlaceholders(text));
};

const shouldHideStreamingScriptPreview = (text) => {
  return markdownScriptPreviewUtils.isLikelyStreamingScriptPreview(text);
};

const assistantMarkdownSlotInjector = (html) => {
  return markdownScriptPreviewInjector(html);
};

const SCRIPT_PREVIEW_MIN_HEIGHT = 180;
const SCRIPT_PREVIEW_MAX_HEIGHT = 6000;

const { t } = useI18n();

const activeThinkingBlock = computed(() =>
  props.message.content.find(c => c.contentBlockName === StreamingConstant.ContentBlock.THINKING.name) ?? null,
);

const { formatted: thinkingDurationText } = useElapsedDuration({
  startedAt: () => activeThinkingBlock.value?.startedAt ?? null,
  endedAt: () => (activeThinkingBlock.value ? props.message.getThinkingBlockEndedAt(activeThinkingBlock.value) : null),
});

const thinkingProgressText = computed(() => {
  const base = t(StreamingConstant.ContentBlock.THINKING.i18nTitle);
  if (!activeThinkingBlock.value?.startedAt) return base;
  return `${base} (${thinkingDurationText.value})`;
});

const handleClick = (event) => {
  const { target } = event;
  if (target.tagName === 'A' && target.hasAttribute('data-index')) {
    event.preventDefault();
    props.onReferenceClick(Number(target.getAttribute('data-index')));
  }
};

const contentImageBlocks = computed(() => props.message.content.filter(content => content.contentBlockType === StreamingConstant.ContentBlockType.IMAGE.value));

const contentNonImageBlocks = computed(() => props.message.content.filter(content => (content.contentBlockType !== StreamingConstant.ContentBlockType.IMAGE.value) && !content.hiddenInChat));

const hasBubbleContent = computed(() => {
  return props.message.thinkingSteps.length > 0
    || props.message.isStatusPending
    || props.message.isStatusFailed
    || props.message.isStatusAborted
    || props.message.askUserQuestionPayload
    || props.message.widget
    || contentNonImageBlocks.value.length > 0;
});

const handleScriptPreviewResizeMessage = (event) => {
  const { type, id, height } = event.data || {};
  if (type !== RESIZE_MESSAGE_TYPE || !id) return;

  const iframe = document.getElementById(id);
  if (!iframe?.classList.contains(SCRIPT_PREVIEW_IFRAME_CLASS)) return;

  // The preview iframe is sandboxed with a null origin, so event.origin can't be checked against a known value — verify the message genuinely came from this iframe's window.
  if (event.source !== iframe.contentWindow) return;

  const resolvedHeight = Number(height);
  if (!Number.isFinite(resolvedHeight)) return;

  iframe.style.height = `${Math.min(Math.max(resolvedHeight, SCRIPT_PREVIEW_MIN_HEIGHT), SCRIPT_PREVIEW_MAX_HEIGHT)}px`;
};

onMounted(() => {
  window.addEventListener('message', handleScriptPreviewResizeMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleScriptPreviewResizeMessage);
});
</script>

<template>
  <v-sheet
    :data-status="props.message.status"
    width="100%"
    color="transparent"
    class="d-flex align-start my-6"
  >
    <v-sheet
      color="transparent"
      :height="32"
      class="d-flex align-center"
    >
      <template v-if="props.assistantImage">
        <v-avatar
          size="small"
          color="backgroundScale1"
          :image="props.assistantImage"
        />
      </template>
      <template v-else>
        <v-icon
          :icon="props.icon"
          color="primary"
          size="x-large"
        />
      </template>
    </v-sheet>
    <div class="message-content d-flex flex-column align-start ga-3 pl-4">
      <ChatMessageBubble
        v-if="hasBubbleContent"
        width="100%"
      >
        <div
          class="d-flex flex-column justify-center overflow-auto w-100"
          @click="handleClick"
        >
          <template v-if="props.message.thinkingSteps.length > 0">
            <ChatRoomMessageThinkingSteps
              :message="props.message"
              :title="$t('__actionShowThinkingSteps')"
              class="mb-2"
            />
          </template>
          <template v-else-if="props.message.isStatusPending">
            <template v-if="contentNonImageBlocks.length > 0">
              <AppProgressText
                :text="contentNonImageBlocks.at(-1)?.text"
                class="mb-4"
              />
            </template>
            <template v-else>
              <AppProgressText
                :text="$t('__messageAgentConnecting')"
                class="mb-4"
              />
            </template>
          </template>
          <template v-if="props.message.isStatusFailed && !props.message.widget">
            <span class="text-failed">
              <AppMarkdown :text="props.message.error ?? $t('__instructionInternalServerError')" />
            </span>
          </template>
          <template v-else>
            <template
              v-for="(content, i) in contentNonImageBlocks"
              :key="i"
            >
              <template v-if="content.contentBlockType === StreamingConstant.ContentBlockType.TEXT.value">
                <template v-if="props.message.isStatusCompleted || props.message.isStatusComposing || props.message.isStatusAborted">
                  <template v-if="props.message.isStatusCompleted">
                    <AppMarkdown
                      :text="toAssistantMarkdownText(content.text)"
                      :slot-injector="assistantMarkdownSlotInjector"
                    />
                  </template>
                  <template v-else-if="props.message.isLikelyFinalAnswer">
                    <AppProgressText
                      v-if="props.message.isStatusComposing && shouldHideStreamingScriptPreview(content.text)"
                      :text="$t('__actionGenerating')"
                      class="mb-4"
                    />
                    <AppMarkdownAnimated
                      v-else
                      :text="content.text"
                      :typing-delay="10"
                    />
                  </template>
                  <template v-else-if="content.contentBlockName === StreamingConstant.ContentBlock.THINKING.name">
                    <AppProgressText
                      :enabled="!props.message.isStatusAborted"
                      :text="thinkingProgressText"
                      class="mb-4"
                    />
                  </template>
                  <template v-else>
                    <AppProgressText
                      :text="content.text"
                      class="mb-4"
                    />
                  </template>
                </template>
              </template>
            </template>
            <template v-if="props.message.isStatusAborted">
              <span class="text-failed">
                <AppMarkdown :text="$t('__instructionOperationAborted')" />
              </span>
            </template>
          </template>
          <template v-if="props.message.askUserQuestionPayload">
            <ChatRoomAskUserQuestionCard
              :payload="props.message.askUserQuestionPayload"
              :submitted="props.message.askUserQuestionSubmitted"
              :on-submit="handleSubmitAskUserQuestionAnswers"
            />
          </template>
          <template v-if="props.message.widget">
            <component
              :is="props.message.widget.component"
              v-bind="props.message.widget.props"
            />
          </template>
          <v-fade-transition mode="out-in">
            <ChatMessageBubbleToolbar
              v-if="props.message.isStatusCompleted || props.message.isStatusFailed"
              :text="contentNonImageBlocks.map(item => item.text).join('\n')"
              :show-copy-button="props.showCopyButton"
              :show-read-aloud-button="props.showReadAloudButton"
              :show-retry-button="props.showRetryButton"
              :on-retry="props.onRetry"
            />
          </v-fade-transition>
        </div>
      </ChatMessageBubble>
      <ChatMessageImageList
        v-if="contentImageBlocks.length > 0"
        :items="contentImageBlocks"
        :height="180"
      />
    </div>
  </v-sheet>
</template>

<style lang="scss" scoped>
.message-content {
  width: calc(100% - 32px);
}
</style>
