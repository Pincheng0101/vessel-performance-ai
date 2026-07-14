<script setup>
import { ChatConstant, LangForgeAssistantConstant } from '~/constants';

const model = defineModel({
  type: Boolean,
  default: false,
});

const chatRoomRef = ref(null);
const messages = ref([]);
// AgentCore session id lives with the transcript, not the chat-room component —
// closing the panel unmounts the room but must not drop multi-turn context.
const sessionId = ref(null);

const state = reactive({
  isSending: false,
});

const latestAssistantMessage = computed(() => messages.value.filter(v => v.isRoleAssistant).at(-1));

const abortCurrentChat = () => {
  if (!state.isSending) return;
  chatRoomRef.value?.handleCancel();
  latestAssistantMessage.value?.setStatus(ChatConstant.MessageStatus.ABORTED);
  state.isSending = false;
};

const init = () => {
  messages.value = [];
  sessionId.value = null;
  state.isSending = false;
};

const handleClose = () => {
  abortCurrentChat();
  model.value = false;
};

const handleNewChat = () => {
  init();
  chatRoomRef.value?.restartChat();
};

watch(model, (open) => {
  if (!open) {
    abortCurrentChat();
    return;
  }
  if (messages.value.length === 0) {
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
    expanded-full-height
    gradient-border
    :width="LangForgeAssistantConstant.PANEL_WIDTH"
    @close="handleClose"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-square-edit-outline"
        variant="text"
        tooltip="New chat"
        @click="handleNewChat"
      />
    </template>
    <DashboardCopilotChatRoom
      ref="chatRoomRef"
      v-model:messages="messages"
      v-model:sending="state.isSending"
      v-model:session-id="sessionId"
      fill-height
      background-color="backgroundScale2"
    />
  </AppSlidePanel>
</template>
