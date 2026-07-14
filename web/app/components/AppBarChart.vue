<script setup>
import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, LogarithmicScale, Title, Tooltip } from 'chart.js';
import { toFont } from 'chart.js/helpers';
import { ChartConstant } from '~/constants';
import { BarChartScaleHelper } from '~/models/ui/chart';

/**
 * @import { ChartDataset, Plugin, TooltipItem, ChartOptions } from 'chart.js'
 */

/** @typedef {ChartDataset<'bar', number[]>[]} AppBarChartDataSets */
/** @typedef {(contexts: TooltipItem<'bar'>[]) => string | string[]} AppBarChartTooltipTitleCallback */
/** @typedef {(context: { index: number }) => string | null} AppBarChartTickColorCallback */
/** @typedef {(context: TooltipItem<'bar'>) => string | string[]} AppBarChartTooltipLabelCallback */
/** @typedef {(contexts: TooltipItem<'bar'>[]) => string | string[]} AppBarChartTooltipBeforeBodyCallback */
/** @typedef {ChartOptions<'bar'>} AppBarChartOptions */

/**
 * @type {{ datasets: AppBarChartDataSets, options: AppBarChartOptions, logarithmicScaleThresholdRatio: number, enableLogarithmicScale: boolean, forceUseLogarithmicScale: boolean, tooltipTitleCallback: AppBarChartTooltipTitleCallback | null, tickColorCallback: AppBarChartTickColorCallback | null, tooltipLabelCallback: AppBarChartTooltipLabelCallback | null, tooltipBeforeBodyCallback: AppBarChartTooltipBeforeBodyCallback | null, onBarClick: Function | null }}
 */
const props = defineProps({
  direction: {
    type: String,
    default: ChartConstant.Direction.VERTICAL.value,
  },
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
  logarithmicScaleThresholdRatio: {
    type: Number,
    default: 0.6,
  },
  enableLogarithmicScale: {
    type: Boolean,
    default: false,
  },
  forceUseLogarithmicScale: {
    type: Boolean,
    default: false,
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
  onBarClick: {
    type: Function,
    default: null,
  },
});

const { themeColors } = useCustomTheme();
const { getSecondaryColor } = useChartColors();
const { t } = useI18n();

const useLogarithmicScale = defineModel('useLogarithmicScale', {
  type: Boolean,
  default: false,
});

const DEFAULT_BAR_MAX_THICKNESS = 42;
const DEFAULT_STACK_BORDER_WIDTH = 0.6;
const DEFAULT_HORIZONTAL_TICK_LABEL_MAX_WIDTH = 144;
const HOVER_GROUP_PADDING = 4;
const LOW_VALUE_MARKER_DASH_GAP = 3;
const LOW_VALUE_MARKER_DASH_LENGTH = 4;
const LOW_VALUE_MARKER_OFFSET = 2;
const LOW_VALUE_MARKER_THRESHOLD = 3;
const LOW_VALUE_MARKER_THICKNESS = 3;
const LABEL_TRUNCATE_SUFFIX = '...';

const getActiveBarGroupBounds = ({
  activeElements,
  chartArea,
  isHorizontal,
}) => {
  const positionBounds = activeElements.reduce((bounds, activeElement) => {
    const element = activeElement.element;
    if (!element) {
      return bounds;
    }

    const { height = 0, width = 0, x = 0, y = 0 } = element.getProps(['height', 'width', 'x', 'y'], true);
    const start = isHorizontal ? y - (height / 2) : x - (width / 2);
    const end = isHorizontal ? y + (height / 2) : x + (width / 2);

    return {
      end: Math.max(bounds.end, end),
      start: Math.min(bounds.start, start),
    };
  }, {
    end: Number.NEGATIVE_INFINITY,
    start: Number.POSITIVE_INFINITY,
  });

  if (!Number.isFinite(positionBounds.start) || !Number.isFinite(positionBounds.end)) {
    return null;
  }

  return {
    end: Math.min(isHorizontal ? chartArea.bottom : chartArea.right, positionBounds.end + HOVER_GROUP_PADDING),
    start: Math.max(isHorizontal ? chartArea.top : chartArea.left, positionBounds.start - HOVER_GROUP_PADDING),
  };
};

/**
 * Draws a hover background behind the currently active bar group.
 *
 * @param {Parameters<NonNullable<Plugin<'bar'>['beforeDatasetsDraw']>>[0]} chart - The current Chart.js bar chart instance.
 */
const drawHoverColumnBackground = (chart) => {
  const activeElements = chart.getActiveElements();
  if (!activeElements.length) return;

  const { ctx, chartArea, options } = chart;
  const isHorizontal = options.indexAxis === 'y';
  const bandBounds = getActiveBarGroupBounds({
    activeElements,
    chartArea,
    isHorizontal,
  });
  if (!bandBounds) return;

  ctx.save();
  ctx.fillStyle = themeColors.value.backgroundScale3;

  if (isHorizontal) {
    ctx.fillRect(chartArea.left, bandBounds.start, chartArea.right - chartArea.left, bandBounds.end - bandBounds.start);
  } else {
    ctx.fillRect(bandBounds.start, chartArea.top, bandBounds.end - bandBounds.start, chartArea.bottom - chartArea.top);
  }

  ctx.restore();
};

const hoverColumnBackgroundPlugin = {
  id: 'hoverColumnBackground',
  beforeDatasetsDraw: drawHoverColumnBackground,
};

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LogarithmicScale,
  Title,
  Tooltip,
);

const hasMultipleDatasets = computed(() => props.datasets.length > 1);

const showStackBorders = computed(() => hasMultipleDatasets.value);

const isStackedBarChart = computed(() => {
  const optionScales = props.options?.scales || {};
  const hasStackedScale = Boolean(optionScales.x?.stacked || optionScales.y?.stacked);

  return hasStackedScale && hasMultipleDatasets.value;
});

const stackedBarTotals = computed(() => {
  const labelCount = Math.max(
    props.labels.length,
    ...props.datasets.map(dataset => dataset.data?.length ?? 0),
  );

  return Array.from({ length: labelCount }, (_, dataIndex) => (
    props.datasets.reduce((sum, dataset) => {
      const value = Number(dataset.data?.[dataIndex] ?? 0);

      if (!Number.isFinite(value)) {
        return sum;
      }

      return sum + value;
    }, 0)
  ));
});

const canUseLogarithmicScale = computed(() => {
  const canUseByChartData = BarChartScaleHelper.canUseLogarithmicScale({
    datasets: props.datasets,
    labels: props.labels,
    logarithmicScaleThresholdRatio: props.logarithmicScaleThresholdRatio,
    options: props.options,
  });

  if (canUseByChartData) {
    return true;
  }

  return props.forceUseLogarithmicScale && !BarChartScaleHelper.hasNegativeBarValue(props.datasets);
});

const isUsingLogarithmicScale = computed(() => canUseLogarithmicScale.value && useLogarithmicScale.value);

const shouldShowLowValueMarkers = computed(() => !isUsingLogarithmicScale.value);

const getParsedBarValueFromMeta = (meta, dataIndex) => {
  const value = Number(meta?._parsed?.[dataIndex]?.[meta?.vScale?.axis]);

  return Number.isFinite(value) ? value : 0;
};

const getBarHead = (bar) => {
  return bar.horizontal ? bar.x : bar.y;
};

const getBarPixelLength = bar => Math.abs(getBarHead(bar) - bar.base);

const getIndexPixelFromMeta = (meta, dataIndex) => {
  const parsedIndexValue = meta?._parsed?.[dataIndex]?.[meta?.iScale?.axis];

  return meta.iScale.getPixelForValue(parsedIndexValue, dataIndex);
};

const resolveBarDirection = ({
  bar,
  value,
}) => {
  const currentDelta = getBarHead(bar) - bar.base;

  if (currentDelta !== 0) {
    return Math.sign(currentDelta);
  }

  if (bar.horizontal) {
    return value >= 0 ? 1 : -1;
  }

  return value >= 0 ? -1 : 1;
};

const resolveValueScaleDirection = ({
  meta,
  value,
}) => {
  const base = meta.vScale.getBasePixel();
  const head = meta.vScale.getPixelForValue(value);
  const direction = Math.sign(head - base);

  if (direction !== 0) {
    return direction;
  }

  return meta.vScale.isHorizontal()
    ? (value >= 0 ? 1 : -1)
    : (value >= 0 ? -1 : 1);
};

const getLowValueMarkerLine = ({
  bar,
  dataIndex,
  direction,
  meta,
}) => {
  const indexPixel = getIndexPixelFromMeta(meta, dataIndex);
  const valueBasePixel = meta.vScale.getBasePixel();
  const valueMarkerPixel = valueBasePixel + (direction * (LOW_VALUE_MARKER_OFFSET + (LOW_VALUE_MARKER_THICKNESS / 2)));

  return meta.vScale.isHorizontal()
    ? {
        xEnd: valueMarkerPixel,
        xStart: valueMarkerPixel,
        yEnd: indexPixel + (bar.height / 2),
        yStart: indexPixel - (bar.height / 2),
      }
    : {
        xEnd: indexPixel + (bar.width / 2),
        xStart: indexPixel - (bar.width / 2),
        yEnd: valueMarkerPixel,
        yStart: valueMarkerPixel,
      };
};

const drawLowValueMarker = ({
  bar,
  chart,
  dataIndex,
  direction,
  meta,
}) => {
  const {
    xEnd,
    xStart,
    yEnd,
    yStart,
  } = getLowValueMarkerLine({
    bar,
    dataIndex,
    direction,
    meta,
  });

  chart.ctx.save();
  chart.ctx.strokeStyle = themeColors.value.backgroundScale4;
  chart.ctx.lineCap = 'butt';
  chart.ctx.lineWidth = LOW_VALUE_MARKER_THICKNESS;
  chart.ctx.setLineDash([
    LOW_VALUE_MARKER_DASH_LENGTH,
    LOW_VALUE_MARKER_DASH_GAP,
  ]);
  chart.ctx.beginPath();
  chart.ctx.moveTo(xStart, yStart);
  chart.ctx.lineTo(xEnd, yEnd);
  chart.ctx.stroke();
  chart.ctx.restore();
};

const drawLowValueMarkerForBar = ({
  bar,
  chart,
  dataIndex,
  meta,
  value,
}) => {
  if (value === 0 || getBarPixelLength(bar) >= LOW_VALUE_MARKER_THRESHOLD) {
    return;
  }

  drawLowValueMarker({
    bar,
    chart,
    dataIndex,
    direction: resolveBarDirection({
      bar,
      value,
    }),
    meta,
  });
};

const getVisibleBarMetas = chart => chart.getSortedVisibleDatasetMetas()
  .filter(meta => meta.type === ChartConstant.Type.BAR.value);

const getStackedBarEntryGroups = ({
  chart,
  dataIndex,
}) => {
  const stackedBarsByKey = new Map();

  getVisibleBarMetas(chart).forEach((meta) => {
    const bar = meta.data?.[dataIndex];
    const value = getParsedBarValueFromMeta(meta, dataIndex);

    if (!bar || bar.hidden || value === 0) {
      return;
    }

    const stackKey = `${meta.stack ?? '__default'}:${Math.sign(value)}`;

    if (!stackedBarsByKey.has(stackKey)) {
      stackedBarsByKey.set(stackKey, []);
    }

    stackedBarsByKey.get(stackKey).push({
      bar,
      meta,
      value,
    });
  });

  return stackedBarsByKey;
};

const isLowValueStackEntryGroup = (entries) => {
  const [firstEntry] = entries;

  if (!firstEntry) {
    return false;
  }

  const base = firstEntry.meta.vScale.getBasePixel();
  const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0);
  const stackLength = Math.abs(firstEntry.meta.vScale.getPixelForValue(totalValue) - base);

  return stackLength < LOW_VALUE_MARKER_THRESHOLD;
};

const hasLowValueMarkerAtDataIndex = ({
  chart,
  dataIndex,
}) => {
  if (!shouldShowLowValueMarkers.value || dataIndex === undefined || !chart.getDataVisibility(dataIndex)) {
    return false;
  }

  if (isStackedBarChart.value) {
    return [...getStackedBarEntryGroups({
      chart,
      dataIndex,
    }).values()].some(isLowValueStackEntryGroup);
  }

  return getVisibleBarMetas(chart).some((meta) => {
    const bar = meta.data?.[dataIndex];
    const value = getParsedBarValueFromMeta(meta, dataIndex);

    return bar && value !== 0 && getBarPixelLength(bar) < LOW_VALUE_MARKER_THRESHOLD;
  });
};

const drawLowValueMarkersForStackedBars = (chart) => {
  const visibleMetas = getVisibleBarMetas(chart);
  const labelCount = Math.max(
    chart.data.labels?.length ?? 0,
    ...visibleMetas.map(meta => meta.data.length),
  );

  for (let dataIndex = 0; dataIndex < labelCount; dataIndex += 1) {
    if (!chart.getDataVisibility(dataIndex)) {
      continue;
    }

    getStackedBarEntryGroups({
      chart,
      dataIndex,
    }).forEach((entries) => {
      const [firstEntry] = entries;
      const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0);
      const direction = resolveValueScaleDirection({
        meta: firstEntry.meta,
        value: totalValue,
      });

      if (!isLowValueStackEntryGroup(entries)) {
        return;
      }

      drawLowValueMarker({
        bar: firstEntry.bar,
        chart,
        dataIndex,
        direction,
        meta: firstEntry.meta,
      });
    });
  }
};

/**
 * Draws a small marker for non-zero bars that are too short to read on a linear scale.
 *
 * @param {Parameters<NonNullable<Plugin<'bar'>['afterDatasetsDraw']>>[0]} chart - The current Chart.js bar chart instance.
 */
const drawLowValueMarkers = (chart) => {
  if (!shouldShowLowValueMarkers.value) {
    return;
  }

  const { chartArea, ctx } = chart;

  ctx.save();
  ctx.beginPath();
  ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
  ctx.clip();

  if (isStackedBarChart.value) {
    drawLowValueMarkersForStackedBars(chart);
    ctx.restore();
    return;
  }

  getVisibleBarMetas(chart)
    .forEach((meta) => {
      meta.data.forEach((bar, dataIndex) => {
        if (!chart.getDataVisibility(dataIndex)) {
          return;
        }

        drawLowValueMarkerForBar({
          bar,
          chart,
          dataIndex,
          meta,
          value: getParsedBarValueFromMeta(meta, dataIndex),
        });
      });
    });

  ctx.restore();
};

const lowValueMarkerPlugin = {
  id: 'lowValueMarker',
  afterDatasetsDraw: drawLowValueMarkers,
};

const normalizeTooltipLines = (value) => {
  if (Array.isArray(value)) {
    return value.filter(line => line !== undefined && line !== null && line !== '');
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return [value];
};

const shouldShowLowValueMarkerTooltip = (contexts) => {
  const firstContext = contexts?.[0];

  if (!firstContext?.chart) {
    return false;
  }

  return hasLowValueMarkerAtDataIndex({
    chart: firstContext.chart,
    dataIndex: firstContext.dataIndex,
  });
};

const truncateTextByWidth = ({
  ctx,
  font,
  maxWidth,
  text,
}) => {
  const safeText = String(text ?? '');
  if (!ctx) {
    return safeText;
  }

  ctx.save();
  ctx.font = font || ctx.font;

  const measureTextWidth = value => ctx.measureText(String(value)).width;
  let result = safeText;

  if (measureTextWidth(safeText) <= maxWidth) {
    ctx.restore();
    return result;
  }

  if (measureTextWidth(LABEL_TRUNCATE_SUFFIX) > maxWidth) {
    result = '';
    ctx.restore();
    return result;
  }

  const characters = Array.from(safeText);
  let left = 0;
  let right = characters.length;

  while (left < right) {
    const middle = Math.ceil((left + right) / 2);
    const candidate = `${characters.slice(0, middle).join('')}${LABEL_TRUNCATE_SUFFIX}`;

    if (measureTextWidth(candidate) <= maxWidth) {
      left = middle;
    } else {
      right = middle - 1;
    }
  }

  result = `${characters.slice(0, left).join('')}${LABEL_TRUNCATE_SUFFIX}`;
  ctx.restore();
  return result;
};

const normalizedDatasets = computed(() => props.datasets.map((dataset, index) => ({
  ...dataset,
  backgroundColor: dataset.backgroundColor || getSecondaryColor(index),
  borderColor: dataset.borderColor ?? themeColors.value.background,
  borderWidth: dataset.borderWidth ?? (showStackBorders.value ? DEFAULT_STACK_BORDER_WIDTH : 0),
  maxBarThickness: dataset.maxBarThickness ?? DEFAULT_BAR_MAX_THICKNESS,
})));

const chartPlugins = computed(() => [
  hoverColumnBackgroundPlugin,
  lowValueMarkerPlugin,
]);

const getParsedBarValue = (context) => {
  return props.direction === ChartConstant.Direction.HORIZONTAL.value
    ? context.parsed.x
    : context.parsed.y;
};

const appendStackedBarPercentage = (label, context) => {
  if (!isStackedBarChart.value) {
    return label;
  }

  const percentageLabel = numUtils.formatShareLabel(
    getParsedBarValue(context),
    stackedBarTotals.value[context.dataIndex],
  );
  const suffix = ` (${percentageLabel})`;

  if (Array.isArray(label)) {
    const lines = [...label];
    let lastLineIndex = -1;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (typeof lines[index] === 'string') {
        lastLineIndex = index;
        break;
      }
    }

    if (lastLineIndex === -1) {
      return lines;
    }

    lines[lastLineIndex] = `${lines[lastLineIndex]}${suffix}`;
    return lines;
  }

  if (typeof label !== 'string') {
    return label;
  }

  return `${label}${suffix}`;
};

const resolvedTooltipLabelCallback = computed(() => {
  return (context) => {
    if (props.tooltipLabelCallback) {
      return appendStackedBarPercentage(props.tooltipLabelCallback(context), context);
    }

    const label = context.dataset.label ? `${context.dataset.label}: ` : '';
    const value = getParsedBarValue(context);

    return appendStackedBarPercentage(`${label}${numUtils.format(value)}`, context);
  };
});

const resolvedTooltipTitleCallback = computed(() => {
  if (!props.tooltipTitleCallback) {
    return null;
  }

  return (contexts) => {
    return props.tooltipTitleCallback(contexts);
  };
});

const resolvedTooltipBeforeBodyCallback = computed(() => {
  return (contexts) => {
    return normalizeTooltipLines(props.tooltipBeforeBodyCallback?.(contexts));
  };
});

const resolvedTooltipAfterBodyCallback = computed(() => {
  return (contexts) => {
    if (shouldShowLowValueMarkerTooltip(contexts)) {
      return t('__tooltipChartLowValueMarker');
    }

    return '';
  };
});

const resolveHorizontalAxisLabel = (scale, value) => truncateTextByWidth({
  ctx: scale.chart?.ctx,
  font: toFont(scale.options?.ticks?.font).string,
  maxWidth: DEFAULT_HORIZONTAL_TICK_LABEL_MAX_WIDTH,
  text: scale.getLabelForValue(value),
});

const resolveLogarithmicScaleTitle = (optionTitle = {}) => {
  if (!isUsingLogarithmicScale.value) {
    return optionTitle;
  }

  const optionTitleText = optionTitle.text;
  const titleText = Array.isArray(optionTitleText)
    ? [...optionTitleText, t('__fieldChartScaleLog')]
    : [optionTitleText, t('__fieldChartScaleLog')].filter(Boolean).join(' ');

  return {
    ...optionTitle,
    color: optionTitle.color ?? themeColors.value.text,
    display: true,
    text: titleText,
  };
};

const resolveValueScaleOptions = (optionScale = {}) => {
  const scaleOptions = { ...optionScale };

  if (isUsingLogarithmicScale.value) {
    if (Number(scaleOptions.min) <= 0) {
      delete scaleOptions.min;
    }

    if (Number(scaleOptions.suggestedMin) <= 0) {
      delete scaleOptions.suggestedMin;
    }
  }

  return {
    ...scaleOptions,
    beginAtZero: isUsingLogarithmicScale.value ? false : (scaleOptions.beginAtZero ?? true),
    title: resolveLogarithmicScaleTitle(scaleOptions.title),
    type: isUsingLogarithmicScale.value ? ChartConstant.ScaleType.LOGARITHMIC.value : ChartConstant.ScaleType.LINEAR.value,
  };
};

const resolvedOptions = computed(() => {
  const isHorizontal = props.direction === ChartConstant.Direction.HORIZONTAL.value;
  const optionInteraction = props.options?.interaction || {};
  const optionLayout = props.options?.layout || {};
  const optionPadding = optionLayout.padding || {};
  const optionScales = props.options?.scales || {};
  const optionScalesX = optionScales.x || {};
  const optionScalesXTicks = optionScalesX.ticks || {};
  const optionScalesY = optionScales.y || {};
  const optionScalesYTicks = optionScalesY.ticks || {};
  const resolvedScalesX = isHorizontal ? resolveValueScaleOptions(optionScalesX) : optionScalesX;
  const resolvedScalesY = isHorizontal ? optionScalesY : resolveValueScaleOptions(optionScalesY);

  const afterBuildTicks = (axis) => {
    if (!isUsingLogarithmicScale.value) return;

    // Filter to keep only power-of-10 ticks (e.g., 10, 100, 1000) for a cleaner log scale appearance
    axis.ticks = axis.ticks.filter((tick) => {
      const log10 = Math.log10(tick.value);
      return Number.isInteger(Math.round(log10 * 1000000) / 1000000);
    });
  };

  return {
    ...props.options,
    indexAxis: isHorizontal ? 'y' : 'x',
    interaction: {
      mode: 'index',
      axis: isHorizontal ? 'y' : 'x',
      intersect: false,
      ...optionInteraction,
    },
    layout: {
      ...optionLayout,
      padding: {
        ...optionPadding,
      },
    },
    scales: {
      ...optionScales,
      x: {
        ...resolvedScalesX,
        afterBuildTicks: isHorizontal ? afterBuildTicks : null,
        ticks: {
          ...optionScalesXTicks,
          ...(isHorizontal
            ? {
                callback(value, index, ticks) {
                  if (typeof optionScalesXTicks.callback === 'function') {
                    return optionScalesXTicks.callback.call(this, value, index, ticks);
                  }

                  return numUtils.format(value);
                },
              }
            : {}),
        },
      },
      y: {
        ...resolvedScalesY,
        afterBuildTicks: isHorizontal ? null : afterBuildTicks,
        ticks: {
          ...optionScalesYTicks,
          ...(isHorizontal
            ? {
                callback(value, index, ticks) {
                  if (typeof optionScalesYTicks.callback === 'function') {
                    return optionScalesYTicks.callback.call(this, value, index, ticks);
                  }

                  return resolveHorizontalAxisLabel(this, value);
                },
              }
            : {
                callback(value, index, ticks) {
                  if (typeof optionScalesYTicks.callback === 'function') {
                    return optionScalesYTicks.callback.call(this, value, index, ticks);
                  }
                  return numUtils.format(value);
                },
              }),
        },
      },
    },
  };
});
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <AppChart
      :type="ChartConstant.Type.BAR.value"
      :height="props.height"
      :labels="props.labels"
      :datasets="normalizedDatasets"
      :title="props.title"
      :options="resolvedOptions"
      :tick-color-callback="props.tickColorCallback"
      :tooltip-title-callback="resolvedTooltipTitleCallback"
      :tooltip-label-callback="resolvedTooltipLabelCallback"
      :tooltip-before-body-callback="resolvedTooltipBeforeBodyCallback"
      :tooltip-after-body-callback="resolvedTooltipAfterBodyCallback"
      :plugins="chartPlugins"
      :on-element-click="props.onBarClick"
    />
    <div
      v-if="props.enableLogarithmicScale && canUseLogarithmicScale"
      class="d-flex justify-center align-center ga-2"
    >
      <AppInputLabel
        class="h-100 text-caption"
        :label="$t('__fieldChartExpandSmallValues')"
        :tooltip="$t('__tooltipChartExpandSmallValues')"
      />
      <AppSwitch
        v-model="useLogarithmicScale"
        size="xx-small"
        hide-details
      />
    </div>
  </div>
</template>
