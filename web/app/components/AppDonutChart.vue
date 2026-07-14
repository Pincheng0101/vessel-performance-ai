<script setup>
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';
import { ChartConstant } from '~/constants';

/**
 * @import { ChartDataset, ChartOptions, Plugin, TooltipItem } from 'chart.js'
 */

/** @typedef {ChartDataset<'doughnut', number[]>[]} AppDonutChartDataSets */
/** @typedef {ChartOptions<'doughnut'>} AppDonutChartOptions */
/** @typedef {Plugin<'doughnut'>[]} AppDonutChartPlugins */

Chart.register(
  ArcElement,
  DoughnutController,
  Legend,
  Tooltip,
);

const props = defineProps({
  height: {
    type: Number,
    default: null,
  },
  minHeight: {
    type: Number,
    default: null,
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
  tooltipValueFormatter: {
    type: Function,
    default: null,
  },
  segmentLimit: {
    type: Number,
    default: ChartConstant.Donut.SEGMENT_LIMIT,
  },
  othersLabel: {
    type: String,
    default: '',
  },
  plugins: {
    type: Array,
    default: () => [],
  },
});

const { themeColors } = useCustomTheme();
const { getOthersColor, getSecondaryColor } = useChartColors();
const { t } = useI18n();

const DEFAULT_CUTOUT = '64%';
const DEFAULT_BORDER_WIDTH = 0.6;
const DEFAULT_HOVER_OFFSET = 6;
const DEFAULT_LAYOUT_PADDING = 12;
const LEGEND_MAX_WIDTH = '50%';

const getRankedSegmentColors = (values, othersIndex = null) => {
  const colors = [];
  const rankedValues = values
    .map((value, index) => ({
      index,
      value,
    }))
    .filter(({ index }) => index !== othersIndex)
    .sort((left, right) => right.value - left.value || left.index - right.index);

  rankedValues.forEach(({ index }, rank) => {
    colors[index] = getSecondaryColor(rank);
  });

  if (othersIndex !== null) {
    colors[othersIndex] = getOthersColor();
  }

  return colors;
};

const formatTooltipValue = (value) => {
  if (typeof props.tooltipValueFormatter === 'function') {
    return props.tooltipValueFormatter(value);
  }

  return numUtils.format(value);
};

const resolvedOthersLabel = computed(() => props.othersLabel || t('__fieldOthers'));

const chartData = computed(() => {
  const labels = Array.isArray(props.labels) ? props.labels : [];
  const datasets = Array.isArray(props.datasets) ? props.datasets : [];
  const segmentLimit = props.segmentLimit;

  if (!segmentLimit || labels.length <= segmentLimit) {
    return {
      datasets,
      labels,
      othersSegments: [],
      othersIndex: null,
    };
  }

  const firstDatasetValues = (datasets[0]?.data ?? []).map(value => Number(value ?? 0));
  const rankedSegments = labels
    .map((label, index) => ({
      index,
      label,
      value: firstDatasetValues[index] ?? 0,
    }))
    .sort((left, right) => right.value - left.value || left.index - right.index);
  const topSegments = rankedSegments.slice(0, segmentLimit);
  const otherSegments = rankedSegments.slice(segmentLimit);
  const resolvedLabels = [
    ...topSegments.map(segment => segment.label),
    resolvedOthersLabel.value,
  ];
  const resolvedDatasets = datasets.map((dataset) => {
    const data = dataset.data ?? [];
    const hasBackgroundColorArray = Array.isArray(dataset.backgroundColor);

    return {
      ...dataset,
      backgroundColor: hasBackgroundColorArray
        ? [
            ...topSegments.map(segment => dataset.backgroundColor[segment.index]),
            getOthersColor(),
          ]
        : dataset.backgroundColor,
      data: [
        ...topSegments.map(segment => Number(data[segment.index] ?? 0)),
        otherSegments.reduce((sum, segment) => sum + Number(data[segment.index] ?? 0), 0),
      ],
    };
  });

  return {
    datasets: resolvedDatasets,
    labels: resolvedLabels,
    othersSegments: otherSegments.map(segment => ({
      index: segment.index,
      label: segment.label,
    })),
    othersIndex: resolvedLabels.length - 1,
  };
});

const chartLabels = computed(() => chartData.value.labels);

const normalizedDatasets = computed(() => chartData.value.datasets.map((dataset) => {
  const rankedSegmentColors = getRankedSegmentColors(
    (dataset.data ?? []).map(value => Number(value ?? 0)),
    chartData.value.othersIndex,
  );

  return {
    ...dataset,
    backgroundColor: Array.isArray(dataset.backgroundColor) && dataset.backgroundColor.length
      ? chartLabels.value.map((_, index) => dataset.backgroundColor[index] || rankedSegmentColors[index])
      : dataset.backgroundColor || chartLabels.value.map((_, index) => rankedSegmentColors[index]),
    borderColor: dataset.borderColor ?? themeColors.value.background,
    borderWidth: dataset.borderWidth ?? DEFAULT_BORDER_WIDTH,
    hoverOffset: dataset.hoverOffset ?? DEFAULT_HOVER_OFFSET,
  };
}));

const firstDatasetValues = computed(() => (
  (normalizedDatasets.value[0]?.data ?? []).map(value => Number(value ?? 0))
));

const totalValue = computed(() => (
  firstDatasetValues.value.reduce((sum, value) => sum + value, 0)
));

const legendItems = computed(() => {
  const firstDataset = normalizedDatasets.value[0] || {};
  const backgroundColors = firstDataset.backgroundColor;

  const total = totalValue.value;

  return chartLabels.value.map((label, index) => ({
    color: Array.isArray(backgroundColors)
      ? backgroundColors[index]
      : backgroundColors,
    label,
    valueLabel: numUtils.formatPercentageLabel(
      total > 0 ? ((firstDatasetValues.value[index] ?? 0) / total) * 100 : 0,
    ),
  }));
});

const resolvedOptions = computed(() => {
  const optionInteraction = props.options?.interaction || {};
  const optionLayout = props.options?.layout || {};
  const optionPlugins = props.options?.plugins || {};
  const optionTooltip = optionPlugins.tooltip || {};
  const optionTooltipCallbacks = optionTooltip.callbacks || {};

  return {
    cutout: DEFAULT_CUTOUT,
    ...props.options,
    layout: {
      padding: DEFAULT_LAYOUT_PADDING,
      ...optionLayout,
    },
    plugins: {
      ...optionPlugins,
      legend: {
        display: true,
        ...(optionPlugins.legend || {}),
      },
      tooltip: {
        ...optionTooltip,
        callbacks: {
          ...optionTooltipCallbacks,
          title() {
            return [];
          },
        },
      },
    },
    interaction: {
      intersect: true,
      mode: 'nearest',
      ...optionInteraction,
    },
  };
});

const chartPlugins = computed(() => props.plugins);

const tooltipLabelCallback = computed(() => {
  return (context) => {
    const value = Number(context.raw ?? 0);
    const label = context.label ? `${context.label}: ` : '';
    const tooltipLines = [`${label}${formatTooltipValue(value)}`];

    if (context.dataIndex !== chartData.value.othersIndex) {
      return tooltipLines[0];
    }

    const originalDataset = props.datasets?.[context.datasetIndex] ?? {};
    const originalValues = Array.isArray(originalDataset.data) ? originalDataset.data : [];
    const othersTooltipLines = chartData.value.othersSegments.map((segment) => {
      const segmentValue = Number(originalValues[segment.index] ?? 0);

      return `${segment.label}: ${formatTooltipValue(segmentValue)}`;
    });

    return [
      ...tooltipLines,
      ...othersTooltipLines,
    ];
  };
});
</script>

<template>
  <AppChart
    :type="ChartConstant.Type.DOUGHNUT.value"
    :height="props.height"
    :min-height="props.minHeight"
    :labels="chartLabels"
    :datasets="normalizedDatasets"
    :title="props.title"
    :options="resolvedOptions"
    :plugins="chartPlugins"
    :tooltip-label-callback="tooltipLabelCallback"
    :legend-items="legendItems"
    :legend-max-width="LEGEND_MAX_WIDTH"
    :use-cartesian-scales="false"
  />
</template>
