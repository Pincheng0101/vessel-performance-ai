<script setup>
import { ChartConstant } from '~/constants';

const props = defineProps({
  usageRows: {
    type: Array,
    default: () => [],
  },
  pricingTable: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  segmentLimit: {
    type: Number,
    default: ChartConstant.Donut.SEGMENT_LIMIT,
  },
});
</script>

<template>
  <AppDialog
    :aria-label="$t('__titleUsageModelTokenBreakdown')"
    color="backgroundScale2"
    :width="1000"
  >
    <template #activator="{ onOpen }">
      <slot
        name="activator"
        :on-open="onOpen"
      >
        <AppIconButton
          :size="24"
          icon="mdi-table"
          variant="text"
          icon-size="small"
          :tooltip="$t('__actionViewUsageModelTokenBreakdown')"
          :on-click="onOpen"
        />
      </slot>
    </template>
    <template #body="{ onCancel }">
      <div class="usage-model-token-breakdown-dialog">
        <div class="d-flex align-start justify-space-between pa-4">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              {{ $t('__titleUsageModelTokenBreakdown') }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ $t('__descriptionUsageModelTokenBreakdown') }}
            </div>
          </div>
          <AppIconButton
            icon="mdi-close"
            variant="text"
            :tooltip="$t('__actionClose')"
            :on-click="onCancel"
          />
        </div>
        <v-divider />
        <div class="usage-model-token-breakdown-dialog__body pa-4">
          <UsageModelTokenBreakdownTable
            :usage-rows="props.usageRows"
            :pricing-table="props.pricingTable"
            :loading="props.loading"
            :segment-limit="props.segmentLimit"
            bordered
          />
        </div>
      </div>
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.usage-model-token-breakdown-dialog {
  max-height: 84vh;
  overflow: hidden;
}

.usage-model-token-breakdown-dialog__body {
  // 84vh - header top padding - header bottom padding - title/description height - divider height
  max-height: calc(84vh - 16px - 16px - 48px - 1px);
  overflow: auto;
}
</style>
