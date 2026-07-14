<script setup>
import { AgentUserPreferences } from '~/models/ui/agent';

definePageMeta({
  layout: 'chat',
});

const route = useRoute();
const agentChatStore = useAgentChatStore();
const authStore = useAuthStore();
const server = useServer();

await Promise.all([
  agentChatStore.fetchAgent(route.params.id),
  agentChatStore.loadPins({
    agentId: route.params.id,
    userId: authStore.parsedToken.sub,
  }),
]);

const { data: preferenceData } = await server.uiData.get({
  key: AgentUserPreferences.getUiDataKey(route.params.id, authStore.parsedToken.sub),
}, {
  lazy: false,
});
const preferredStorageId = preferenceData.value?.value?.storageId ?? null;
const preferredLlmId = preferenceData.value?.value?.llmId ?? null;
</script>

<template>
  <AgentChatRoom
    v-if="agentChatStore.agent"
    :agent="agentChatStore.agent"
    :storage-id="preferredStorageId"
    :llm-id="preferredLlmId"
    :has-messages="false"
  />
</template>
