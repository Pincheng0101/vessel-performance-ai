import { ChartConstant, LlmConstant, UsageConstant } from '~/constants';

const MODEL_DISTRIBUTION_DONUT_MIN_HEIGHT = 240;

const getModelDisplayName = model => findField(LlmConstant.Model, model, 'title') || model;

class UsageChartConfig {
  constructor({
    datasets = [],
    direction,
    height,
    i18nTitle = '',
    i18nTooltip = '',
    labels = [],
    labelsMetadata = [],
    minHeight,
    options = {},
    resourceType = '',
    showTooltipTotal = true,
    type,
    valueFormat = UsageConstant.ValueFormat.NUMBER.value,
  } = {}) {
    this.datasets = datasets;
    this.direction = direction;
    this.height = height;
    this.i18nTitle = i18nTitle;
    this.i18nTooltip = i18nTooltip;
    this.labels = labels;
    this.labelsMetadata = labelsMetadata;
    this.minHeight = minHeight;
    this.options = UsageChartConfig.mergeOptions(
      UsageChartConfig.buildDefaultOptions({
        type,
        direction,
        valueFormat,
      }),
      options,
    );
    this.resourceType = resourceType;
    this.showTooltipTotal = showTooltipTotal;
    this.type = type;
    this.valueFormat = valueFormat;
  }

  /**
   * Builds a model-distribution doughnut config for the given chart variant. Rows are
   * sorted by the variant's metric (descending) and labels resolve to LLM display names.
   *
   * @param {Object} options
   * @param {{ model: string, totalTokens?: number, estimatedCost?: number }[]} [options.rows=[]]
   * @param {string} options.variant - A `UsageConstant.ChartVariant` value.
   * @returns {UsageChartConfig}
   */
  static buildModelDistribution({
    rows = [],
    variant,
  } = {}) {
    const isCost = variant === UsageConstant.ChartVariant.ESTIMATED_COST.value;
    const metricKey = isCost
      ? UsageConstant.MetricField.ESTIMATED_COST.value
      : UsageConstant.MetricField.TOTAL_TOKENS.value;
    const sortedRows = [...rows].sort((left, right) => right[metricKey] - left[metricKey]);

    return new UsageChartConfig({
      type: ChartConstant.Type.DOUGHNUT.value,
      minHeight: MODEL_DISTRIBUTION_DONUT_MIN_HEIGHT,
      i18nTitle: isCost ? '__titleUsageModelEstimatedCostDistribution' : '__titleUsageModelTokenDistribution',
      i18nTooltip: isCost ? '__tooltipUsageEstimatedCost' : '',
      labels: sortedRows.map(row => getModelDisplayName(row.model)),
      showTooltipTotal: false,
      valueFormat: isCost ? UsageConstant.ValueFormat.CURRENCY.value : UsageConstant.ValueFormat.NUMBER.value,
      datasets: [
        {
          data: sortedRows.map(row => row[metricKey]),
        },
      ],
    });
  }

  static buildDefaultOptions({
    type,
    direction,
    valueFormat,
  } = {}) {
    if (type === ChartConstant.Type.DOUGHNUT.value) {
      return {
        maintainAspectRatio: false,
        responsive: true,
      };
    }

    const isHorizontal = direction === ChartConstant.Direction.HORIZONTAL.value;
    const groupAxisKey = isHorizontal ? 'y' : 'x';
    const valueAxisKey = isHorizontal ? 'x' : 'y';
    const valueTickCallback = valueFormat === UsageConstant.ValueFormat.CURRENCY.value
      ? value => `$${numUtils.format(value, 2)}`
      : value => numUtils.formatCompact(value);

    return {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        [groupAxisKey]: {
          stacked: true,
        },
        [valueAxisKey]: {
          beginAtZero: true,
          stacked: true,
          ticks: {
            callback: valueTickCallback,
          },
        },
      },
    };
  }

  static mergeOptions(defaultOptions, overrideOptions = {}) {
    const defaultScales = defaultOptions.scales || {};
    const overrideScales = overrideOptions.scales || {};
    const defaultX = defaultScales.x || {};
    const defaultY = defaultScales.y || {};
    const overrideX = overrideScales.x || {};
    const overrideY = overrideScales.y || {};
    const hasScales = Object.keys(defaultScales).length > 0 || Object.keys(overrideScales).length > 0;

    return {
      ...defaultOptions,
      ...overrideOptions,
      ...(hasScales
        ? {
            scales: {
              ...defaultScales,
              ...overrideScales,
              x: {
                ...defaultX,
                ...overrideX,
                ticks: {
                  ...(defaultX.ticks || {}),
                  ...(overrideX.ticks || {}),
                },
              },
              y: {
                ...defaultY,
                ...overrideY,
                ticks: {
                  ...(defaultY.ticks || {}),
                  ...(overrideY.ticks || {}),
                },
              },
            },
          }
        : {}),
    };
  }
}

export default UsageChartConfig;
