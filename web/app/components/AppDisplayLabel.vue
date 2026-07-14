<script setup>
const props = defineProps({
  label: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <AppInputLabel :label="props.label" />
</template>
