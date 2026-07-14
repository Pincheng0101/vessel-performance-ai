<script setup>
const props = defineProps({
  backgroundColor: {
    type: String,
    default: 'transparent',
  },
  minHeight: {
    type: [String, Number],
    default: 32,
  },
  width: {
    type: [String, Number],
    default: null,
  },
  maxWidth: {
    type: [String, Number],
    default: '100%',
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <template v-if="props.loading">
    <AppSkeletonLoader
      :height="props.minHeight"
      :width="props.width"
      :border-radius="16"
    />
  </template>
  <template v-else>
    <v-sheet
      :color="props.backgroundColor"
      :width="props.width"
      :max-width="props.maxWidth"
      :min-height="props.minHeight"
      height="100%"
      class="d-flex align-center"
    >
      <slot />
    </v-sheet>
  </template>
</template>

<style lang="scss" scoped>
.v-sheet {
  border-radius: 16px;
  :deep(p) {
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
