<script setup>
const props = defineProps({
  hasContent: {
    type: Boolean,
    default: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
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
});

const shouldShowChartLimitNote = computed(() => (
  props.showChartLimitNote && !props.isLoading && props.chartLimit > 0
));

const shouldShowTitleSection = computed(() => (
  props.title || props.tooltip || shouldShowChartLimitNote.value
));
</script>

<template>
  <v-card
    class="wrapper"
    variant="flat"
  >
    <v-card-text class="pt-0 pb-4 px-0">
      <div
        v-if="shouldShowTitleSection"
        class="title-section d-flex flex-column justify-center mb-2"
      >
        <AppInputLabel
          v-if="props.title || props.tooltip"
          :label="props.title"
          :tooltip="props.tooltip || null"
        />
        <div
          v-if="shouldShowChartLimitNote"
          class="text-caption text-medium-emphasis"
        >
          {{ $t('__instructionUsageChartLimit', { limit: props.chartLimit }) }}
        </div>
      </div>
      <div
        v-if="props.description"
        class="text-caption text-medium-emphasis mb-2"
      >
        {{ props.description }}
      </div>
      <div v-if="props.isLoading">
        <AppSkeletonLoader type="image" />
      </div>
      <template v-else-if="props.hasContent">
        <slot />
      </template>
      <template v-else>
        <AppInfoCard :instruction="$t('__instructionNoResultsFound')" />
      </template>
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

:deep() {
  .v-skeleton-loader__image {
    border-radius: 4px;
    height: 300px;
  }
}
</style>
