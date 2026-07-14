<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'text',
  },
  backgroundColor: {
    type: String,
    default: null,
  },
  height: {
    type: [String, Number],
    default: undefined,
  },
  width: {
    type: [String, Number],
    default: '100%',
  },
});
</script>

<template>
  <v-skeleton-loader
    :type="props.type"
    :width="props.width"
  />
</template>

<style lang="scss" scoped>
:deep() {
  .v-skeleton-loader__chip {
    height: v-bind('props.height ? `${props.height}px` : "auto"');
  }
}
</style>
