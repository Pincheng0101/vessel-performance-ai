<script setup>
import { StreamingToolUseContentBlockResponse } from '~/models/websocket/chat/contentBlock';

const props = defineProps({
  item: {
    type: StreamingToolUseContentBlockResponse,
    required: true,
  },
  width: {
    type: Number,
    default: undefined,
  },
});

const hasToolInput = computed(() => (
  objUtils.isObject(props.item.toolInput) && Object.keys(props.item.toolInput).length > 0
));
</script>

<template>
  <ChatRoomMessageThinkingStepsCollapsible :title="$t('__messageAgentThinkingStepToolUsing').replace('{toolName}', strUtils.toPascalCase(props.item.name))">
    <AppDisplayField
      :item="hasToolInput
        ? {
          value: props.item.toolInput,
          isJsonToMarkdown: true,
          markdownViewerOptions: {
            enableAnchors: false,
            maxHeight: 300,
            width: props.width,
          },
        }
        : { value: null }"
    />
  </ChatRoomMessageThinkingStepsCollapsible>
</template>
