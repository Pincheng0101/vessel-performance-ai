<script setup>
import { IconConstant } from '~/constants';

const props = defineProps({
  agent: {
    type: Object,
    required: true,
  },
  sessionId: {
    type: String,
    default: null,
  },
  username: {
    type: String,
    default: null,
  },
  hasMessages: {
    type: Boolean,
    default: true,
  },
  fillHeight: {
    type: Boolean,
    default: false,
  },
});

const { state, loadMessages } = useChatTranscript({
  agentId: () => props.agent.id,
  sessionId: () => props.sessionId,
  username: () => props.username,
  hasMessages: () => props.hasMessages,
});
</script>

<template>
  <ChatRoom
    :key="`${props.sessionId}|${props.username}`"
    v-model:messages="state.messages"
    readonly
    :title="props.agent.name"
    :description="props.agent.description"
    :assistant-icon="IconConstant.Base.AGENT"
    :assistant-image="props.agent?.uiConfig?.avatarImage"
    :has-history="!!props.sessionId && !state.isEmpty"
    :fill-height="props.fillHeight"
    :on-load="loadMessages"
    show-copy-button
    :show-read-aloud-button="false"
  />
</template>
