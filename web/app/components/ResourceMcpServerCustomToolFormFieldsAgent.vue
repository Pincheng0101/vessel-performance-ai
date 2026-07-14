<script setup>
const agentId = defineModel('agentId', {
  type: String,
  default: '',
});
</script>

<template>
  <ResourceAgentPaginatedSelect
    v-model="agentId"
    :return-object="false"
    required
  />
</template>
