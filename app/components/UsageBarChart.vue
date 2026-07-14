<script setup>
import { ResourceConstant, UsageConstant } from '~/constants';

/**
 * @import { UsageChartConfig } from '~/models/ui/usage';
 */

/**
 * @type {{ chart: UsageChartConfig }}
 */
const props = defineProps({
  chart: {
    type: Object,
    default: null,
  },
  onBarClick: {
    type: Function,
    default: null,
  },
  enableLogarithmicScale: {
    type: Boolean,
    default: false,
  },
  forceUseLogarithmicScale: {
    type: Boolean,
    default: false,
  },
});

const useLogarithmicScale = defineModel('useLogarithmicScale', {
  type: Boolean,
  default: false,
});

const { t } = useI18n();
const { getUsageDatasetTypeColor } = useUsageChartColors();
const { themeColors } = useCustomTheme();

const resolveDatasetLabel = (dataset) => {
  switch (dataset.datasetType) {
    case UsageConstant.DatasetType.INPUT.value:
      return t(UsageConstant.DatasetType.INPUT.i18nTitle);
    case UsageConstant.DatasetType.OUTPUT.value:
      return t(UsageConstant.DatasetType.OUTPUT.i18nTitle);
    case UsageConstant.DatasetType.CACHE_READ_INPUT.value:
      return t(UsageConstant.DatasetType.CACHE_READ_INPUT.i18nTitle);
    case UsageConstant.DatasetType.CACHE_WRITE_INPUT.value:
      return t(UsageConstant.DatasetType.CACHE_WRITE_INPUT.i18nTitle);
    default:
      return dataset.label ?? '';
  }
};

const resolveDatasetColor = (dataset, index) => {
  if (dataset.backgroundColor || dataset.borderColor) {
    return dataset.backgroundColor || dataset.borderColor;
  }

  return getUsageDatasetTypeColor(dataset.datasetType, index);
};

const resolveTotalValue = (dataIndex) => {
  return (resolvedChart.value.datasets ?? []).reduce(
    (sum, dataset) => sum + Number(dataset.data?.[dataIndex] ?? 0),
    0,
  );
};

const formatValue = (value, valueFormat) => {
  switch (valueFormat) {
    case UsageConstant.ValueFormat.CURRENCY.value:
      return `$${numUtils.format(value, 2)}`;
    case UsageConstant.ValueFormat.NUMBER.value:
    default:
      return numUtils.format(value);
  }
};

const resolvedChart = computed(() => {
  return {
    ...props.chart,
    datasets: (props.chart.datasets ?? []).map((dataset, index) => {
      const datasetColor = resolveDatasetColor(dataset, index);

      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || datasetColor,
        label: resolveDatasetLabel(dataset),
      };
    }),
  };
});

const tooltipLabelCallback = computed(() => {
  return (context) => {
    const parsedValue = context.chart.options.indexAxis === 'y' ? context.parsed.x : context.parsed.y;
    const datasetLabel = context.dataset.label ? `${context.dataset.label}: ` : '';
    return `${datasetLabel}${formatValue(parsedValue, props.chart.valueFormat)}`;
  };
});

const tooltipBeforeBodyCallback = computed(() => {
  return (contexts) => {
    if (!props.chart.showTooltipTotal) {
      return '';
    }

    const dataIndex = contexts[0]?.dataIndex;

    if (dataIndex === undefined) {
      return '';
    }

    return `${t('__fieldTotal')}: ${formatValue(resolveTotalValue(dataIndex), props.chart.valueFormat)}`;
  };
});

const tooltipTitleCallback = computed(() => {
  return (contexts) => {
    const context = contexts[0];
    const label = context?.label ?? '';
    const metadata = props.chart.labelsMetadata?.[context?.dataIndex];

    if (metadata?.isDeleted && props.chart.resourceType) {
      const i18nResourceTitle = findField(ResourceConstant.Type, props.chart.resourceType, 'i18nTitle');
      const deletedLabel = t('__labelUsageResourceDeleted', {
        resourceType: i18nResourceTitle ? t(i18nResourceTitle) : props.chart.resourceType,
      });
      return `${label} (${strUtils.addSpacesAroundAscii(deletedLabel)})`;
    }

    return label;
  };
});

const tickColorCallback = computed(() => {
  return (context) => {
    const metadata = props.chart.labelsMetadata?.[context?.index];

    if (metadata?.isDeleted && props.chart.resourceType) {
      return themeColors.value.disabled;
    }

    return null;
  };
});
</script>

<template>
  <v-card
    class="usage-bar-chart pa-4"
    variant="text"
  >
    <AppBarChart
      v-model:use-logarithmic-scale="useLogarithmicScale"
      :direction="resolvedChart.direction"
      :height="resolvedChart.height"
      :labels="resolvedChart.labels"
      :datasets="resolvedChart.datasets"
      :options="resolvedChart.options"
      :tick-color-callback="tickColorCallback"
      :tooltip-title-callback="tooltipTitleCallback"
      :tooltip-label-callback="tooltipLabelCallback"
      :tooltip-before-body-callback="tooltipBeforeBodyCallback"
      :enable-logarithmic-scale="props.enableLogarithmicScale"
      :force-use-logarithmic-scale="props.forceUseLogarithmicScale"
      :on-bar-click="props.onBarClick"
    />
  </v-card>
</template>

<style lang="scss" scoped>
.usage-bar-chart {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  transition: border 0.25s;
  &:hover {
    border: 1px solid #000000;
  }
}

@at-root .v-theme--dark .usage-bar-chart:hover {
  border: 1px solid #ffffff;
}
</style>
