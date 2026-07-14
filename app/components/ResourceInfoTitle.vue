<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <v-sheet
    :height="32"
    color="transparent"
    class="d-flex align-center ga-1 text-h5 font-weight-bold my-2"
  >
    {{ props.title }}
    <slot name="prepend" />
  </v-sheet>
</template>
