<script setup>
const props = defineProps({
  backgroundColor: {
    type: String,
    default: 'background',
  },
  loading: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <v-sheet
    v-if="props.loading"
    :color="props.backgroundColor"
    width="100%"
    height="100%"
    class="position-absolute top-0 left-0 d-flex justify-center align-center"
  >
    <AppProgressDots />
  </v-sheet>
</template>
