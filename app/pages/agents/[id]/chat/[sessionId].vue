<script setup>
definePageMeta({
  layout: 'chat',
});

const route = useRoute();
const agentChatStore = useAgentChatStore();
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const server = useServer();

breadcrumbStore.setLoading(true);

await Promise.all([
  agentChatStore.fetchAgent(route.params.id),
  agentChatStore.loadPins({
    agentId: route.params.id,
    userId: authStore.parsedToken.sub,
  }),
]);

const { data: chatSession } = await server.chatSession.get({
  agentId: route.params.id,
  sessionId: route.params.sessionId,
}, {
  lazy: false,
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.sessionId, _data.sessionName);
    breadcrumbStore.setLoading(false);
  },
});
const storageId = chatSession.value?.storageId ?? null;
const hasMessages = !!chatSession.value?.lastMessageTs;
</script>

<template>
  <AgentChatRoom
    v-if="agentChatStore.agent && !agentChatStore.isNavigating"
    :agent="agentChatStore.agent"
    :session-id="route.params.sessionId"
    :storage-id="storageId"
    :has-messages="hasMessages"
  />
</template>
