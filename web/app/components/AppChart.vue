<script setup>
import { Chart } from 'chart.js';

/**
 * @import { ChartDataset, ChartOptions, ChartTypeRegistry, Plugin, TooltipItem } from 'chart.js'
 */

/** @typedef {keyof ChartTypeRegistry} AppChartType */
/** @typedef {ChartOptions<keyof ChartTypeRegistry>} AppChartOptions */
/** @typedef {Plugin<keyof ChartTypeRegistry>[]} AppChartPlugins */
/** @typedef {ChartDataset<AppChartType, unknown[]>[]} AppChartDataSets */
/** @typedef {(context: TooltipItem<AppChartType>) => string | string[]} AppChartTooltipLabelCallback */
/** @typedef {(contexts: TooltipItem<AppChartType>[]) => string | string[]} AppChartTooltipBodyCallback */
/** @typedef {(context: { index: number }) => string | null} AppChartTickColorCallback */
/** @typedef {(payload: { chart: Chart, dataIndex: number, dataset: ChartDataset<AppChartType, unknown[]> | undefined, datasetIndex: number, label: unknown, nativeEvent: unknown }) => void} AppChartElementClickCallback */

/**
 * @type {{ type: AppChartType, datasets: AppChartDataSets, options: AppChartOptions, plugins: AppChartPlugins, tooltipTitleCallback: AppChartTooltipBodyCallback | null, tickColorCallback: AppChartTickColorCallback | null, tooltipLabelCallback: AppChartTooltipLabelCallback | null, tooltipBeforeBodyCallback: AppChartTooltipBodyCallback | null, tooltipAfterBodyCallback: AppChartTooltipBodyCallback | null, onElementClick: AppChartElementClickCallback | null, legendItems: { color: string, label: string, valueLabel?: string }[] | null, legendMaxWidth: string, useCartesianScales: boolean }}
 */
const props = defineProps({
  height: {
    type: Number,
    default: null,
  },
  minHeight: {
    type: Number,
    default: null,
  },
  type: {
    type: String,
    required: true,
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
  tooltipTitleCallback: {
    type: Function,
    default: null,
  },
  tickColorCallback: {
    type: Function,
    default: null,
  },
  tooltipLabelCallback: {
    type: Function,
    default: null,
  },
  tooltipBeforeBodyCallback: {
    type: Function,
    default: null,
  },
  tooltipAfterBodyCallback: {
    type: Function,
    default: null,
  },
  options: {
    type: Object,
    default: () => {},
  },
  plugins: {
    type: Array,
    default: () => [],
  },
  onElementClick: {
    type: Function,
    default: null,
  },
  legendItems: {
    type: Array,
    default: null,
  },
  legendMaxWidth: {
    type: String,
    default: '40%',
  },
  useCartesianScales: {
    type: Boolean,
    default: true,
  },
});

const { themeColors } = useCustomTheme();
const { smAndUp } = useDisplay();

const chartElement = ref(null);

let chartInstance = null;

const FONT_FAMILY = 'Roboto, sans-serif';
const INTERACTION_MODE = 'index';
const TITLE_ALIGN = 'start';
const TITLE_FONT_SIZE = 14;
const TITLE_FONT_WEIGHT = 'normal';
const TITLE_PADDING_BOTTOM = 24;
const TOOLTIP_BODY_FONT_SIZE = 12;
const TOOLTIP_BODY_SPACING = 10;
const TOOLTIP_BORDER_WIDTH = 1;
const TOOLTIP_BOX_PADDING = 8;
const TOOLTIP_BOX_SIZE = 8;
const TOOLTIP_CARET_PADDING = 0;
const TOOLTIP_CARET_SIZE = 0;
const TOOLTIP_CORNER_RADIUS = 14;
const TOOLTIP_PADDING = 14;
const TOOLTIP_POSITION = 'nearest';
const TOOLTIP_TITLE_FONT_SIZE = 14;
const TOOLTIP_TITLE_FONT_WEIGHT = 'bold';
const TOOLTIP_TITLE_MARGIN_BOTTOM = 12;
const TOOLTIP_MAX_LINE_LENGTH = 32;
const TOOLTIP_X_ALIGN = 'center';
const TOOLTIP_Y_ALIGN = 'bottom';

const getChartFont = extra => ({
  family: FONT_FAMILY,
  ...extra,
});

const legendOptions = computed(() => props.options?.plugins?.legend || {});

const showLegend = computed(() => legendOptions.value.display !== false);

const wrapTooltipLine = (line) => {
  if (typeof line !== 'string' || line.length <= TOOLTIP_MAX_LINE_LENGTH) {
    return [line];
  }

  const lines = [];
  const words = line.split(/\s+/).filter(Boolean);
  let currentLine = '';

  words.forEach((word) => {
    if (word.length > TOOLTIP_MAX_LINE_LENGTH) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }

      for (let index = 0; index < word.length; index += TOOLTIP_MAX_LINE_LENGTH) {
        lines.push(word.slice(index, index + TOOLTIP_MAX_LINE_LENGTH));
      }

      return;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > TOOLTIP_MAX_LINE_LENGTH) {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const wrapTooltipText = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(item => wrapTooltipLine(item));
  }

  if (value === undefined || value === null || value === '') {
    return value ?? '';
  }

  return wrapTooltipLine(value);
};

const resolvedLegendItems = computed(() => {
  if (!showLegend.value) {
    return [];
  }

  if (Array.isArray(props.legendItems)) {
    return props.legendItems;
  }

  return props.datasets
    .filter(dataset => Boolean(dataset.label))
    .map(dataset => ({
      color: Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[0]
        : dataset.backgroundColor,
      label: dataset.label,
    }));
});

const chartOptions = computed(() => {
  const options = props.options || {};
  const optionPlugins = options.plugins || {};
  const optionScales = options.scales || {};
  const optionTooltip = optionPlugins.tooltip || {};
  const optionTooltipCallbacks = optionTooltip.callbacks || {};
  const optionScalesX = optionScales.x || {};
  const optionScalesY = optionScales.y || {};
  const restOptionTooltip = { ...optionTooltip };

  delete restOptionTooltip.callbacks;

  const textColor = themeColors.value.text;
  const gridColor = themeColors.value.backgroundScale3;
  const tooltipBackgroundColor = themeColors.value.backgroundScale1;
  const tooltipBodyColor = themeColors.value.text;
  const tooltipTitleColor = themeColors.value.text;
  const tooltipBorderColor = themeColors.value.backgroundScale3;

  const categoryAxisKey = options.indexAxis === 'y' ? 'y' : 'x';
  const resolveTickColor = (axisKey) => {
    if (!props.tickColorCallback || axisKey !== categoryAxisKey) {
      return textColor;
    }

    return context => props.tickColorCallback(context) ?? textColor;
  };

  return {
    ...options,
    responsive: true,
    maintainAspectRatio: false,
    font: {
      family: FONT_FAMILY,
    },
    interaction: {
      mode: INTERACTION_MODE,
      intersect: false,
      ...(options.interaction || {}),
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        align: TITLE_ALIGN,
        color: textColor,
        display: Boolean(props.title),
        padding: {
          bottom: TITLE_PADDING_BOTTOM,
        },
        text: props.title,
        font: getChartFont({
          size: TITLE_FONT_SIZE,
          weight: TITLE_FONT_WEIGHT,
        }),
        ...(optionPlugins.title || {}),
      },
      tooltip: {
        backgroundColor: tooltipBackgroundColor,
        bodyColor: tooltipBodyColor,
        bodySpacing: TOOLTIP_BODY_SPACING,
        borderColor: tooltipBorderColor,
        borderWidth: TOOLTIP_BORDER_WIDTH,
        boxHeight: TOOLTIP_BOX_SIZE,
        boxPadding: TOOLTIP_BOX_PADDING,
        boxWidth: TOOLTIP_BOX_SIZE,
        caretPadding: TOOLTIP_CARET_PADDING,
        caretSize: TOOLTIP_CARET_SIZE,
        cornerRadius: TOOLTIP_CORNER_RADIUS,
        displayColors: true,
        padding: TOOLTIP_PADDING,
        position: TOOLTIP_POSITION,
        titleColor: tooltipTitleColor,
        titleMarginBottom: TOOLTIP_TITLE_MARGIN_BOTTOM,
        usePointStyle: true,
        xAlign: TOOLTIP_X_ALIGN,
        yAlign: TOOLTIP_Y_ALIGN,
        titleFont: () => getChartFont({
          size: TOOLTIP_TITLE_FONT_SIZE,
          weight: TOOLTIP_TITLE_FONT_WEIGHT,
        }),
        bodyFont: () => getChartFont({
          size: TOOLTIP_BODY_FONT_SIZE,
        }),
        callbacks: {
          title(context) {
            const title = props.tooltipTitleCallback
              ? props.tooltipTitleCallback(context)
              : context[0]?.label;
            return title ? wrapTooltipText(title) : [];
          },
          beforeBody(context) {
            if (props.tooltipBeforeBodyCallback) {
              return wrapTooltipText(props.tooltipBeforeBodyCallback(context));
            }

            return '';
          },
          afterBody(context) {
            if (props.tooltipAfterBodyCallback) {
              return wrapTooltipText(props.tooltipAfterBodyCallback(context));
            }

            return '';
          },
          label(context) {
            let tooltipLabel = null;

            if (props.tooltipLabelCallback) {
              tooltipLabel = props.tooltipLabelCallback(context);
            } else {
              const label = context.dataset.label ? `${context.dataset.label}: ` : '';
              tooltipLabel = `${label}${context.formattedValue}`;
            }

            return wrapTooltipText(tooltipLabel);
          },
          ...optionTooltipCallbacks,
        },
        ...restOptionTooltip,
      },
    },
    onClick(event, elements, chart) {
      options.onClick?.(event, elements, chart);

      if (!props.onElementClick || !elements.length) {
        return;
      }

      const activeElement = elements[0];

      props.onElementClick({
        chart,
        dataIndex: activeElement.index,
        dataset: chart.data.datasets?.[activeElement.datasetIndex],
        datasetIndex: activeElement.datasetIndex,
        label: chart.data.labels?.[activeElement.index],
        nativeEvent: event,
      });
    },
    onHover(event, elements, chart) {
      options.onHover?.(event, elements, chart);

      if (!chart?.canvas) {
        return;
      }

      chart.canvas.style.cursor = props.onElementClick && elements.length ? 'pointer' : 'default';
    },
    ...(props.useCartesianScales
      ? {
          scales: {
            x: {
              ...optionScalesX,
              grid: {
                color: gridColor,
              },
              ticks: {
                color: resolveTickColor('x'),
                font: getChartFont(),
                ...(optionScalesX.ticks || {}),
              },
            },
            y: {
              beginAtZero: true,
              ...optionScalesY,
              ticks: {
                color: resolveTickColor('y'),
                font: getChartFont(),
                ...(optionScalesY.ticks || {}),
              },
              grid: {
                color: gridColor,
              },
            },
          },
        }
      : {}),
  };
});

const renderChart = () => {
  if (!chartElement.value) return;

  chartInstance?.destroy();

  chartInstance = new Chart(chartElement.value, {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: props.datasets,
    },
    options: chartOptions.value,
    plugins: props.plugins,
  });
};

watch(() => ({
  type: props.type,
  labels: props.labels,
  datasets: props.datasets,
  title: props.title,
  options: props.options,
  plugins: props.plugins,
  themeColors: themeColors.value,
  tooltipTitleCallback: props.tooltipTitleCallback,
  tickColorCallback: props.tickColorCallback,
  tooltipLabelCallback: props.tooltipLabelCallback,
  tooltipBeforeBodyCallback: props.tooltipBeforeBodyCallback,
  tooltipAfterBodyCallback: props.tooltipAfterBodyCallback,
  onElementClick: props.onElementClick,
  legendItems: props.legendItems,
  useCartesianScales: props.useCartesianScales,
}),
() => renderChart(),
{ deep: true },
);

onMounted(() => renderChart());

onBeforeUnmount(() => {
  chartInstance?.destroy();
  chartInstance = null;
});
</script>

<template>
  <div class="wrapper w-100 d-flex flex-column flex-sm-row align-center ga-3 ga-sm-5">
    <div class="chart-canvas flex-grow-1">
      <canvas
        ref="chartElement"
        class="d-block"
      />
    </div>
    <div
      v-if="resolvedLegendItems.length"
      class="d-flex flex-row flex-sm-column flex-wrap flex-sm-nowrap justify-start align-start align-self-start align-self-sm-end ga-2 mb-0 mb-sm-3 flex-shrink-0"
      :style="{ maxWidth: smAndUp ? props.legendMaxWidth : undefined }"
    >
      <div
        v-for="(item, index) in resolvedLegendItems"
        :key="`${item.label}-${index}`"
        class="chart-legend__item d-inline-flex align-start ga-2"
      >
        <div class="chart-legend__swatch-wrapper d-flex align-center">
          <span
            class="chart-legend__swatch flex-shrink-0 rounded-circle"
            :style="{ backgroundColor: item.color }"
          />
        </div>
        <span class="chart-legend__text text-text text-body-2">
          {{ item.label }}<span
            v-if="item.valueLabel"
            class="font-weight-bold text-no-wrap"
          >: {{ item.valueLabel }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  min-height: v-bind('props.minHeight ? `${props.minHeight}px` : "auto"');
}

.chart-canvas {
  height: v-bind('props.height ? `${props.height}px` : (props.minHeight ? `${props.minHeight}px` : "auto")');
  min-height: 0;
  min-width: 0;
}

.chart-canvas canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-legend__item {
  max-width: 100%;
}

.chart-legend__swatch-wrapper {
  height: 20px;
}

.chart-legend__swatch {
  width: 8px;
  height: 8px;
}

.chart-legend__text {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
