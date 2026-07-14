<script setup>
definePageMeta({
  layout: 'chat',
});

const assistantStore = useAssistantStore();
const { messages } = storeToRefs(assistantStore);

onBeforeUnmount(() => {
  assistantStore.setMessages([]);
});
</script>

<template>
  <LangForgeAssistantChatRoom v-model:messages="messages" />
</template>
