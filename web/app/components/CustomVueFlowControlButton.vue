<script setup>
const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  tooltip: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-btn
    :height="28"
    :min-width="28"
    color="transparent"
    tile
    flat
    class="px-0"
  >
    <v-icon
      :icon="props.icon"
      size="small"
      color="text"
    />
    <template v-if="props.tooltip">
      <AppTooltip
        :text="props.tooltip"
        activator="parent"
      />
    </template>
  </v-btn>
</template>

<style lang="scss" scoped>
.v-btn {
  &.v-btn--disabled {
    opacity: 0.5;
  }
}
</style>
