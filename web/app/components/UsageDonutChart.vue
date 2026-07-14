<script setup>
import { UsageConstant } from '~/constants';

/**
 * @import { UsageChartConfig } from '~/models/ui/usage';
 */

const props = defineProps({
  chart: {
    type: Object,
    default: null,
  },
});

const { t } = useI18n();
const { themeColors } = useCustomTheme();

const CENTER_LABEL_FONT_FAMILY = 'Roboto, sans-serif';
const CENTER_LABEL_FONT_SIZE = 12;
const CENTER_VALUE_FONT_SIZE = 20;

const formatValue = (value, valueFormat) => {
  switch (valueFormat) {
    case UsageConstant.ValueFormat.CURRENCY.value:
      return `$${numUtils.format(value, 2)}`;
    case UsageConstant.ValueFormat.NUMBER.value:
    default:
      return numUtils.format(value);
  }
};

const resolveTotalValue = () => {
  const firstDataset = props.chart?.datasets?.[0];
  return (firstDataset?.data ?? []).reduce(
    (sum, value) => sum + Number(value ?? 0),
    0,
  );
};

const centerTextPlugin = computed(() => ({
  id: 'usageDonutCenterText',
  afterDatasetsDraw(chart) {
    const totalValue = resolveTotalValue();
    const formattedValue = formatValue(totalValue, props.chart?.valueFormat);
    const { ctx } = chart;
    const { left, right, top, bottom } = chart.chartArea;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeColors.value.text;
    ctx.font = `${CENTER_LABEL_FONT_SIZE}px ${CENTER_LABEL_FONT_FAMILY}`;
    ctx.fillText(t('__fieldTotal'), centerX, centerY - 12);
    ctx.font = `600 ${CENTER_VALUE_FONT_SIZE}px ${CENTER_LABEL_FONT_FAMILY}`;
    ctx.fillText(formattedValue, centerX, centerY + 10);
    ctx.restore();
  },
}));

const chartPlugins = computed(() => [
  centerTextPlugin.value,
]);

const resolvedChart = computed(() => {
  return {
    ...props.chart,
    datasets: (props.chart?.datasets ?? []).map(dataset => ({
      ...dataset,
    })),
  };
});

</script>

<template>
  <v-card
    class="usage-donut-chart pa-4"
    variant="text"
  >
    <AppDonutChart
      :height="resolvedChart.height"
      :min-height="resolvedChart.minHeight"
      :labels="resolvedChart.labels"
      :datasets="resolvedChart.datasets"
      :options="resolvedChart.options"
      :plugins="chartPlugins"
      :tooltip-value-formatter="value => formatValue(value, props.chart?.valueFormat)"
    />
  </v-card>
</template>

<style lang="scss" scoped>
.usage-donut-chart {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  transition: border 0.25s;
  &:hover {
    border: 1px solid #000000;
  }
}

@at-root .v-theme--dark .usage-donut-chart:hover {
  border: 1px solid #ffffff;
}
</style>
