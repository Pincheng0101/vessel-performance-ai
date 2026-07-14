<script setup>
import { StreamingConstant } from '~/constants';
import { ChatRoomMessage } from '~/models/ui/chatRoom';

const props = defineProps({
  message: {
    type: ChatRoomMessage,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});

const state = reactive({
  tab: 0,
  hasAutoCollapsed: false,
  contentWidth: 0,
});

const VIEWPORT_ITEM_HEIGHT_PX = 48;
const VIEWPORT_MAX_ITEMS = 3;

const rootRef = ref(null);
const viewportRef = ref(null);

const loading = computed(() => props.message.isStatusPending);

// Historical messages (already terminal on mount) skip the streaming viewport entirely so
// users see the full thinking timeline as soon as they expand.
const startedInTerminalStatus = props.message.isStatusCompleted
  || props.message.isStatusFailed
  || props.message.isStatusAborted;

// During streaming we keep the viewport constrained until the auto-collapse completes,
// otherwise releasing the constraint at isLikelyFinalAnswer causes a brief full-expand
// flash right before the panel collapses.
const isViewportConstrained = computed(() => !startedInTerminalStatus && !state.hasAutoCollapsed);

const visibleItemCount = computed(() =>
  Math.min(props.message.thinkingSteps.length, VIEWPORT_MAX_ITEMS),
);

const viewportStyle = computed(() => {
  if (!isViewportConstrained.value) return null;
  return {
    height: `${visibleItemCount.value * VIEWPORT_ITEM_HEIGHT_PX}px`,
    overflowY: 'auto',
  };
});

const items = computed(() => {
  const { thinkingSteps } = props.message;
  if (loading.value) {
    return thinkingSteps.slice(0, -1);
  }
  return thinkingSteps;
});

const updateContentWidth = () => {
  // Parent width - timeline padding - sheet padding + border width
  state.contentWidth = rootRef.value.$el.parentElement.getBoundingClientRect().width - 24 - 24 + 2;
};

const scrollViewportToBottom = async () => {
  await nextTick();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const viewport = viewportRef.value;
  if (!viewport) return;
  scrollUtils.scrollTo({ top: viewport.scrollHeight, target: viewport });
};

watch(() => props.message.thinkingSteps.length, scrollViewportToBottom);

watch(() => props.message, async () => {
  if (state.hasAutoCollapsed) {
    return;
  }
  if (props.message.isLikelyFinalAnswer) {
    state.tab = null;
    await delay(1000);
    state.hasAutoCollapsed = true;
  }
}, {
  deep: true,
});

onMounted(async () => {
  await nextTick();
  updateContentWidth();
  window.addEventListener('resize', updateContentWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContentWidth);
});
</script>

<template>
  <v-expansion-panels
    ref="rootRef"
    v-model="state.tab"
    flat
    class="d-flex justify-start"
  >
    <v-expansion-panel>
      <v-expansion-panel-title class="font-weight-medium">
        {{ props.title }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div
          ref="viewportRef"
          class="thinking-viewport"
          :style="viewportStyle"
        >
          <div class="d-flex flex-column align-start">
            <v-timeline
              dot-color="thinkingStepDotColor"
              side="end"
              size="x-small"
              truncate-line="start"
            >
              <v-timeline-item
                v-for="(item, i) in items"
                :key="i"
                fill-dot
              >
                <template v-if="item.contentBlockType === StreamingConstant.ContentBlockType.TEXT.value">
                  <template v-if="item.text === StreamingConstant.ContentBlock.THINKING.value">
                    {{ $t(StreamingConstant.ContentBlock.THINKING.i18nTitle) }}
                    <ChatRoomMessageThinkingDuration
                      :message="props.message"
                      :content-block="item"
                    />
                  </template>
                  <template v-else>
                    <AppMarkdown
                      :text="item.text"
                      inline
                    />
                  </template>
                </template>
                <template v-else-if="item.contentBlockType === StreamingConstant.ContentBlockType.TOOL_USE.value">
                  <ChatRoomMessageThinkingStepsToolUse
                    :item="item"
                    :width="state.contentWidth"
                  />
                </template>
                <template v-else-if="item.contentBlockType === StreamingConstant.ContentBlockType.TOOL_RESULT.value">
                  <ChatRoomMessageThinkingStepsToolResult
                    :item="item"
                    :width="state.contentWidth"
                  />
                </template>
              </v-timeline-item>
            </v-timeline>
            <template v-if="loading && props.message.thinkingSteps.length > 0">
              <div class="d-flex ga-6">
                <AppProgressCircular
                  :size="22"
                  color="primary"
                />
                <AppProgressText
                  :enabled="!props.message.isLikelyFinalAnswer"
                  :text="props.message.thinkingSteps.at(-1).contentBlockName === StreamingConstant.ContentBlock.THINKING.name ? $t(StreamingConstant.ContentBlock.THINKING.i18nTitle) : props.message.thinkingSteps.at(-1).text"
                />
              </div>
            </template>
          </div>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style lang="scss" scoped>
.thinking-viewport {
  scroll-behavior: smooth;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.v-expansion-panel {
  > button {
    padding: 0;
    max-width: fit-content;
  }
}
.v-expansion-panel,
.v-expansion-panel-title,
.v-expansion-panel-title--active,
.v-expansion-panel-title:hover {
  background-color: transparent;
  min-height: 32px !important;
}
.v-expansion-panel-title__icon {
  margin-inline-start: 4px;
}
:deep() {
  .markdown.inline {
    line-height: 1.5;
  }
  .v-expansion-panel-title__icon {
    margin-left: 4px;
  }
  .v-expansion-panel-text__wrapper {
    padding: 16px 0 !important;
  }
  .v-timeline--vertical.v-timeline--align-center .v-timeline-divider {
    justify-content: start;
  }
  .v-timeline-item__body {
    width: 100%;
  }
  .v-timeline-item__opposite {
    padding-inline-end: 0px !important;
  }
  .v-timeline-item__opposite {
    padding-inline-end: 0 !important;
  }
}
</style>
