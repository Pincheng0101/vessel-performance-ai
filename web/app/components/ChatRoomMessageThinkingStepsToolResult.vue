<script setup>
import * as StreamingConstant from '~/constants/StreamingConstant';
import { StreamingToolResultContentBlockResponse } from '~/models/websocket/chat/contentBlock';

const props = defineProps({
  item: {
    type: StreamingToolResultContentBlockResponse,
    required: true,
  },
  width: {
    type: Number,
    default: undefined,
  },
});
</script>

<template>
  <ChatRoomMessageThinkingStepsCollapsible :title="$t('__messageAgentThinkingStepToolReceivingResults').replace('{toolName}', strUtils.toPascalCase(props.item.name))">
    <div class="d-flex flex-column ga-6">
      <template
        v-for="(content, i) in props.item.content"
        :key="i"
      >
        <template v-if="content.contentBlockType === StreamingConstant.ContentBlockType.TEXT.value">
          <AppDisplayField
            :item="{
              value: content.text.replaceAll(StreamingConstant.ContentBlock.THINKING.value, '$&\n\n'),
              isMarkdown: true,
              markdownViewerOptions: {
                enableAnchors: false,
                maxHeight: 300,
                width: props.width,
              },
            }"
          />
        </template>
        <template v-else-if="content.contentBlockType === StreamingConstant.ContentBlockType.OBJECT.value">
          <AppDisplayField
            :item="{
              value: content.data,
              isJsonToMarkdown: true,
              markdownViewerOptions: {
                enableAnchors: false,
                maxHeight: 300,
                width: props.width,
              },
            }"
          />
        </template>
      </template>
    </div>
  </ChatRoomMessageThinkingStepsCollapsible>
</template>
