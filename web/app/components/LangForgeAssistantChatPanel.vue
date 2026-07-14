<script setup>
import { ChatConstant, LangForgeAssistantConstant } from '~/constants';
import { TextContentBlock } from '~/models/server/contentBlock';
import { AssistantChatRoomMessage } from '~/models/ui/chatRoom';

const props = defineProps({
  greetingMessage: {
    type: String,
    default: null,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const assistantStore = useAssistantStore();
const { messages } = storeToRefs(assistantStore);

const chatRoomRef = ref(null);

const state = reactive({
  isSending: false,
});

const latestAssistantMessage = computed(() => messages.value.filter(v => v.isRoleAssistant).at(-1));

const handleClose = () => {
  if (state.isSending) {
    chatRoomRef.value?.handleCancel();
    latestAssistantMessage.value.setStatus(ChatConstant.MessageStatus.ABORTED);
    state.isSending = false;
  }
  model.value = false;
};

const handleNewChat = () => {
  state.isSending = false;
  assistantStore.setMessages();
  init();
  chatRoomRef.value?.restartChat();
};

const init = () => {
  messages.value = [];
  state.isSending = false;
  if (!props.greetingMessage) return;
  const assistantMessage = new AssistantChatRoomMessage({
    content: [new TextContentBlock({ text: props.greetingMessage })],
    status: ChatConstant.MessageStatus.COMPLETED,
  });
  assistantStore.setMessages([assistantMessage]);
};

watch(() => props.greetingMessage, (after) => {
  if (!after) return;
  if (messages.value.length === 0) {
    init();
    return;
  }
  // Update it if only have greeting message
  if (messages.value.length <= 1) {
    init();
  }
});

watch(model, (after) => {
  if (after) {
    init();
  }
});

onMounted(() => {
  init();
});
</script>

<template>
  <AppSlidePanel
    v-model="model"
    fill-body
    :title="$t('__actionChat')"
    :width="LangForgeAssistantConstant.PANEL_WIDTH"
    @close="handleClose"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-square-edit-outline"
        variant="text"
        :tooltip="$t('__actionNewChat')"
        @click="handleNewChat"
      />
    </template>
    <!-- Viewport height offset: card header + divider + padding + offset -->
    <LangForgeAssistantChatRoom
      ref="chatRoomRef"
      v-model:messages="messages"
      v-model:sending="state.isSending"
      fill-height
      background-color="backgroundScale2"
    />
  </AppSlidePanel>
</template>
