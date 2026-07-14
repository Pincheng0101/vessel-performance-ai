<script setup>
import { ChatConstant } from '~/constants';
import { TextContentBlock } from '~/models/server/contentBlock';
import { AssistantChatRoomMessage } from '~/models/ui/chatRoom';

definePageMeta({
  layout: 'chat',
});

const { t } = useI18n();

const state = reactive({
  /**
   * @type {ChatRoomMessage[]}
   */
  messages: [],
});

const sendMessage = async ({ contentBlocks, pendingMessageId }) => {
  const findPendingById = ({ id }) => id === pendingMessageId;

  state.messages.find(findPendingById)
    .setContentBlock([
      new TextContentBlock({ text: 'Reading input...' }),
    ]);

  const thinkingSteps = [
    'Thinking about question...',
    'Looking up info...',
    'Organizing findings...',
    'Checking logic...',
    'Putting answer together...',
    'Creating response...',
  ];

  await delay(1000);

  for (const step of thinkingSteps) {
    state.messages.find(findPendingById)
      .pushThinkingStep(new TextContentBlock({ text: step }));
    await delay(1000);
  }

  state.messages.find(findPendingById)
    .setContentBlock(contentBlocks)
    .setStatus(ChatConstant.MessageStatus.COMPLETED);

  return true;
};

const init = async () => {
  // Wait until i18n initialization finishes
  await delay();
  const assistantMessage = new AssistantChatRoomMessage({
    content: [
      new TextContentBlock({ text: t('__instructionChatRoomGreeting') }),
    ],
    status: ChatConstant.MessageStatus.COMPLETED,
  });
  state.messages.push(assistantMessage);
};

onMounted(() => {
  init();
});
</script>

<template>
  <ChatRoom
    v-model:messages="state.messages"
    :on-send="sendMessage"
  />
</template>
