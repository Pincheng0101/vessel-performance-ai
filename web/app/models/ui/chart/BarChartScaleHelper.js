const DEFAULT_LOGARITHMIC_SCALE_THRESHOLD_RATIO = 0.6;

class BarChartScaleHelper {
  static normalizeDatasets(datasets = []) {
    return Array.isArray(datasets) ? datasets : [];
  }

  static isStackedBarChart({
    datasets = [],
    options = {},
  } = {}) {
    const normalizedDatasets = BarChartScaleHelper.normalizeDatasets(datasets);
    const optionScales = options?.scales || {};
    const hasStackedScale = Boolean(optionScales.x?.stacked || optionScales.y?.stacked);

    return hasStackedScale && normalizedDatasets.length > 1;
  }

  static buildStackedBarTotals({
    datasets = [],
    labels = [],
  } = {}) {
    const normalizedDatasets = BarChartScaleHelper.normalizeDatasets(datasets);
    const labelCount = Math.max(
      labels.length,
      ...normalizedDatasets.map(dataset => dataset.data?.length ?? 0),
    );

    return Array.from({ length: labelCount }, (_, dataIndex) => (
      normalizedDatasets.reduce((sum, dataset) => {
        const value = Number(dataset.data?.[dataIndex] ?? 0);

        if (!Number.isFinite(value)) {
          return sum;
        }

        return sum + value;
      }, 0)
    ));
  }

  static getBarValues({
    datasets = [],
    labels = [],
    options = {},
  } = {}) {
    const normalizedDatasets = BarChartScaleHelper.normalizeDatasets(datasets);

    if (BarChartScaleHelper.isStackedBarChart({
      datasets: normalizedDatasets,
      options,
    })) {
      return BarChartScaleHelper.buildStackedBarTotals({
        datasets: normalizedDatasets,
        labels,
      });
    }

    return normalizedDatasets.flatMap(dataset => (
      (dataset.data ?? [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value))
    ));
  }

  static hasNegativeBarValue(datasets = []) {
    return BarChartScaleHelper.normalizeDatasets(datasets).some(dataset => (
      (dataset.data ?? []).some((value) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue < 0;
      })
    ));
  }

  static normalizeThresholdRatio(logarithmicScaleThresholdRatio) {
    if (!Number.isFinite(logarithmicScaleThresholdRatio)) {
      return DEFAULT_LOGARITHMIC_SCALE_THRESHOLD_RATIO;
    }

    return Math.min(Math.max(logarithmicScaleThresholdRatio, 0), 1);
  }

  static canUseLogarithmicScale({
    datasets = [],
    labels = [],
    logarithmicScaleThresholdRatio = DEFAULT_LOGARITHMIC_SCALE_THRESHOLD_RATIO,
    options = {},
  } = {}) {
    if (BarChartScaleHelper.hasNegativeBarValue(datasets)) {
      return false;
    }

    const thresholdRatio = BarChartScaleHelper.normalizeThresholdRatio(logarithmicScaleThresholdRatio);
    const positiveBarValues = BarChartScaleHelper.getBarValues({
      datasets,
      labels,
      options,
    }).filter(value => value > 0);

    if (positiveBarValues.length < 2) {
      return false;
    }

    const total = positiveBarValues.reduce((sum, value) => sum + value, 0);
    const max = Math.max(...positiveBarValues);

    return total > 0 && (max / total) >= thresholdRatio;
  }
}

export default BarChartScaleHelper;
