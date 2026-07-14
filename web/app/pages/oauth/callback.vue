<script setup>
import { CookieConstant } from '~/constants';

definePageMeta({
  layout: false,
  middleware: ['public'],
});

const route = useRoute();

onMounted(() => {
  const { code, state, error, error_description: errorDescription } = route.query;
  const channel = new BroadcastChannel(CookieConstant.McpOauth.CALLBACK_CHANNEL);
  channel.postMessage({ code, state, error, errorDescription });
  channel.close();
  window.close();
});
</script>

<template>
  <div />
</template>
