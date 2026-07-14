<script setup>
const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const customTools = defineModel('customTools', {
  type: Array,
  default: () => [],
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('customTools')"
    v-slot="{ label }"
    :label="$t('__fieldCustomTool', 2)"
  >
    <ResourceMcpServerCustomToolTable
      v-model="customTools"
      :aria-label="label"
    />
  </AppInputGroup>
</template>
