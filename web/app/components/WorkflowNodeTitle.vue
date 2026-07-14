<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <AppTitle
    :font-size="12"
    :text="props.text"
    class="mb-2"
  />
</template>
