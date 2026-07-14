<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'error',
  },
});
</script>

<template>
  <v-alert
    :type="props.type"
    density="compact"
    class="my-4"
    :text="props.text"
  />
</template>
