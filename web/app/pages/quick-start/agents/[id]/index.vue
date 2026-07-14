<script setup>
const route = useRoute();
await navigateTo(`/agents/${route.params.id}`, { replace: true });
</script>

<template>
  <div />
</template>
