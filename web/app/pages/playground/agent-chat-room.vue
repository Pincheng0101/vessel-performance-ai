<script setup>
definePageMeta({
  layout: 'chat',
});

const AGENT_ID = 'agent-bac88a128070aa6c';
const agentChatStore = useAgentChatStore();

await agentChatStore.fetchAgent(AGENT_ID);
</script>

<template>
  <AgentChatRoom
    v-if="agentChatStore.agent"
    :agent="agentChatStore.agent"
  />
</template>
