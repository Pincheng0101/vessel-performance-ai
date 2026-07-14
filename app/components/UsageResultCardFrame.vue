<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  tooltip: {
    type: String,
    default: '',
  },
  showChartLimitNote: {
    type: Boolean,
    default: false,
  },
  chartLimit: {
    type: Number,
    default: 0,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const shouldShowChartLimitNote = computed(() => (
  props.showChartLimitNote && !props.isLoading && props.chartLimit > 0
));
</script>

<template>
  <v-card
    class="wrapper"
    variant="flat"
  >
    <v-card-text class="pa-0">
      <div class="d-flex justify-space-between align-end mb-2">
        <div class="title-section d-flex flex-column justify-center">
          <slot name="title">
            <AppInputLabel
              :label="props.title"
              :tooltip="props.tooltip || null"
            />
          </slot>
          <div
            v-if="shouldShowChartLimitNote"
            class="text-caption text-medium-emphasis"
          >
            {{ $t('__instructionUsageChartLimit', { limit: props.chartLimit }) }}
          </div>
        </div>
        <div class="actions-container d-flex align-center ga-2">
          <slot name="actions" />
        </div>
      </div>
      <slot />
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.wrapper {
  background: transparent;
  overflow: visible;
}

.title-section {
  min-height: 28px;
}

.actions-container {
  min-height: 28px;

  :deep(> *) {
    height: 28px;
    align-items: center;
  }
}
</style>
