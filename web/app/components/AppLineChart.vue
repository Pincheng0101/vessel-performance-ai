<script setup>
import { CategoryScale, Chart, Legend, LineController, LineElement, LinearScale, PointElement, Title, Tooltip } from 'chart.js';
import { ChartConstant } from '~/constants';

/**
 * @import { ChartDataset, ChartOptions, TooltipItem } from 'chart.js'
 */

/** @typedef {ChartDataset<'line', number[]>[]} AppLineChartDataSets */
/** @typedef {(context: TooltipItem<'line'>) => string | string[]} AppLineChartTooltipLabelCallback */
/** @typedef {ChartOptions<'line'>} AppLineChartOptions */

Chart.register(
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
);

/**
 * @type {{ datasets: AppLineChartDataSets, options: AppLineChartOptions, tooltipLabelCallback: AppLineChartTooltipLabelCallback | null }}
 */
const props = defineProps({
  height: {
    type: Number,
    default: 300,
  },
  labels: {
    type: Array,
    required: true,
  },
  datasets: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  options: {
    type: Object,
    default: () => {},
  },
  tooltipLabelCallback: {
    type: Function,
    default: null,
  },
});

const DEFAULT_LINE_BORDER_WIDTH = 2;
const DEFAULT_LINE_TENSION = 0.4;
const DEFAULT_POINT_HIT_RADIUS = 12;
const DEFAULT_POINT_RADIUS = 2;
const DEFAULT_POINT_HOVER_RADIUS = 5;

const { getSecondaryColor } = useChartColors();

const normalizedDatasets = computed(() => props.datasets.map((dataset, index) => ({
  ...dataset,
  backgroundColor: dataset.backgroundColor || getSecondaryColor(index),
  borderColor: dataset.borderColor || dataset.backgroundColor || getSecondaryColor(index),
  borderWidth: dataset.borderWidth ?? DEFAULT_LINE_BORDER_WIDTH,
  fill: dataset.fill ?? false,
  tension: dataset.tension ?? DEFAULT_LINE_TENSION,
  pointHitRadius: dataset.pointHitRadius ?? DEFAULT_POINT_HIT_RADIUS,
  pointRadius: dataset.pointRadius ?? DEFAULT_POINT_RADIUS,
  pointHoverRadius: dataset.pointHoverRadius ?? DEFAULT_POINT_HOVER_RADIUS,
})));
</script>

<template>
  <AppChart
    :type="ChartConstant.Type.LINE.value"
    :height="props.height"
    :labels="props.labels"
    :datasets="normalizedDatasets"
    :title="props.title"
    :options="props.options"
    :tooltip-label-callback="props.tooltipLabelCallback"
  />
</template>
