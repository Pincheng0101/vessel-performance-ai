<script setup>
import * as StreamingConstant from '~/constants/StreamingConstant';
import { ChatRoomMessage } from '~/models/ui/chatRoom';

const props = defineProps({
  message: {
    type: ChatRoomMessage,
    required: true,
  },
});

const { parseChatFileContentBlockName } = useAgentAttachment();

const filteredAnswers = computed(() => {
  return props.message.answers?.filter(({ selections, text }) => selections?.length > 0 || text);
});

const normalizedContent = computed(() => props.message.content.map((content) => {
  const metadata = parseChatFileContentBlockName(content.contentBlockName);
  if (!metadata) return content;
  return {
    ...content,
    ...(
      content.contentBlockType === StreamingConstant.ContentBlockType.ATTACHMENT.value
        ? metadata
        : { attachments: [metadata], hiddenInChat: true }
    ),
  };
}));

const contentTextBlocks = computed(() => normalizedContent.value.filter(content => content.contentBlockType === StreamingConstant.ContentBlockType.TEXT.value && !content.hiddenInChat));

const contentImageBlocks = computed(() => normalizedContent.value.filter(content => content.contentBlockType === StreamingConstant.ContentBlockType.IMAGE.value));

const contentFileBlocks = computed(() => normalizedContent.value.filter(content => content.contentBlockType === StreamingConstant.ContentBlockType.ATTACHMENT.value || content.attachments?.length > 0));

const hasBubbleContent = computed(() => contentTextBlocks.value.length > 0 || (contentImageBlocks.value.length < 1 && contentFileBlocks.value.length < 1));
</script>

<template>
  <v-sheet
    color="transparent"
    class="d-flex justify-end my-6"
  >
    <div class="w-100 d-flex flex-column align-end ga-4">
      <template v-if="filteredAnswers?.length > 0">
        <ChatMessageBubble
          :min-width="200"
          background-color="userMessageBubble"
          max-width="60%"
        >
          <div class="d-flex flex-column ga-4 pa-4">
            <div
              v-for="(item, i) in filteredAnswers"
              :key="i"
              class="d-flex flex-column ga-1"
            >
              <p class="font-weight-bold">
                {{ item.header }}
              </p>
              <div
                v-if="item.selections?.length > 0"
                class="d-flex flex-wrap ga-1"
              >
                <v-chip
                  v-for="value in item.selections"
                  :key="value"
                >
                  {{ value }}
                </v-chip>
              </div>
              <p
                v-if="item.text"
                class="text-pre-wrap"
              >
                {{ item.text }}
              </p>
            </div>
          </div>
        </ChatMessageBubble>
      </template>
      <template v-else>
        <ChatMessageBubble
          v-if="hasBubbleContent"
          :text="props.message.content"
          background-color="userMessageBubble"
          max-width="60%"
        >
          <div class="d-flex flex-column ga-3 px-4 py-3 w-100">
            <template v-if="contentTextBlocks.length > 0">
              <p
                v-for="(content, i) in contentTextBlocks"
                :key="`text-${i}`"
              >
                {{ content.text }}
              </p>
            </template>
            <template v-else>
              <p>
                {{ $t('__messageAnswerSkipped') }}
              </p>
            </template>
          </div>
        </ChatMessageBubble>
        <ChatMessageImageList
          v-if="contentImageBlocks.length > 0"
          :items="contentImageBlocks"
          :height="160"
        />
        <ChatMessageFileList
          v-if="contentFileBlocks.length > 0"
          :items="contentFileBlocks"
        />
      </template>
    </div>
  </v-sheet>
</template>

<style lang="scss" scoped>
:deep(.v-chip) {
  background-color: rgb(var(--v-theme-surface));
  background-image: linear-gradient(rgba(var(--v-theme-primary), 0.25), rgba(var(--v-theme-primary), 0.25));
}
.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
