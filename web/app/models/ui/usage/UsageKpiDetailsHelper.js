import { UsageConstant } from '~/constants';

const DEFAULT_TOKEN_BREAKDOWN_DATASET_TYPES = Object.freeze([
  UsageConstant.DatasetType.INPUT.value,
  UsageConstant.DatasetType.CACHE_READ_INPUT.value,
  UsageConstant.DatasetType.CACHE_WRITE_INPUT.value,
  UsageConstant.DatasetType.OUTPUT.value,
]);

const KPI_DETAIL_CONFIG_BY_DATASET_TYPE = Object.freeze({
  [UsageConstant.DatasetType.INPUT.value]: {
    estimatedCostField: 'estimatedInputCost',
    i18nTitle: UsageConstant.DatasetType.INPUT.i18nTitle,
    tokenCountField: 'totalInputTokens',
  },
  [UsageConstant.DatasetType.CACHE_READ_INPUT.value]: {
    estimatedCostField: 'estimatedCacheReadInputCost',
    i18nTitle: UsageConstant.DatasetType.CACHE_READ_INPUT.i18nTitle,
    tokenCountField: 'totalCacheReadInputTokens',
  },
  [UsageConstant.DatasetType.CACHE_WRITE_INPUT.value]: {
    estimatedCostField: 'estimatedCacheWriteInputCost',
    i18nTitle: UsageConstant.DatasetType.CACHE_WRITE_INPUT.i18nTitle,
    tokenCountField: 'totalCacheWriteInputTokens',
  },
  [UsageConstant.DatasetType.OUTPUT.value]: {
    estimatedCostField: 'estimatedOutputCost',
    i18nTitle: UsageConstant.DatasetType.OUTPUT.i18nTitle,
    tokenCountField: 'totalOutputTokens',
  },
});

const sumBreakdownValues = ({
  datasetTypes,
  metricFieldKey,
  metricTotals,
}) => datasetTypes.reduce((sum, datasetType) => {
  const metricFieldName = KPI_DETAIL_CONFIG_BY_DATASET_TYPE[datasetType]?.[metricFieldKey];

  return sum + numUtils.toFiniteNumber(metricTotals?.[metricFieldName]);
}, 0);

const buildFormattedBreakdownValue = ({
  percentageBase,
  value,
  valueFormatter,
}) => ({
  share: numUtils.formatShareLabel(value, percentageBase),
  value: valueFormatter(value),
});

const buildKpiDetails = ({
  datasetTypes = DEFAULT_TOKEN_BREAKDOWN_DATASET_TYPES,
  metricFieldKey,
  metricTotals = {},
  percentageTotal,
  valueFormatter,
} = {}) => {
  const validDatasetTypes = datasetTypes.filter(datasetType => KPI_DETAIL_CONFIG_BY_DATASET_TYPE[datasetType]);
  const totalValue = sumBreakdownValues({
    datasetTypes: validDatasetTypes,
    metricFieldKey,
    metricTotals,
  });
  const percentageBase = percentageTotal ?? totalValue;

  return validDatasetTypes.map((datasetType) => {
    const detailConfig = KPI_DETAIL_CONFIG_BY_DATASET_TYPE[datasetType];
    const metricValue = numUtils.toFiniteNumber(metricTotals?.[detailConfig[metricFieldKey]]);

    return {
      datasetType,
      i18nTitle: detailConfig.i18nTitle,
      ...buildFormattedBreakdownValue({
        percentageBase,
        value: metricValue,
        valueFormatter,
      }),
    };
  });
};

const buildKpiBreakdownDetails = ({
  columns = [],
  datasetTypes = DEFAULT_TOKEN_BREAKDOWN_DATASET_TYPES,
  metricFieldKey,
  percentageTotal,
  valueFormatter,
} = {}) => {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const validDatasetTypes = datasetTypes.filter(datasetType => KPI_DETAIL_CONFIG_BY_DATASET_TYPE[datasetType]);
  const columnTotals = safeColumns.map(({ metricTotals, ...column }) => ({
    ...column,
    metricTotals,
    numericValue: sumBreakdownValues({
      datasetTypes: validDatasetTypes,
      metricFieldKey,
      metricTotals,
    }),
  }));
  const totalValue = columnTotals.reduce((sum, column) => sum + column.numericValue, 0);
  const percentageBase = percentageTotal ?? totalValue;
  const rows = validDatasetTypes.map((datasetType) => {
    const detailConfig = KPI_DETAIL_CONFIG_BY_DATASET_TYPE[datasetType];
    const numericCells = columnTotals.map(column => numUtils.toFiniteNumber(column.metricTotals?.[detailConfig[metricFieldKey]]));
    const rowTotal = numericCells.reduce((sum, value) => sum + value, 0);

    return {
      datasetType,
      i18nTitle: detailConfig.i18nTitle,
      cells: numericCells.map(value => valueFormatter(value)),
      total: valueFormatter(rowTotal),
    };
  });
  return [
    {
      type: UsageConstant.KpiCardDetailsType.BREAKDOWN.value,
      rowHeaderI18nTitle: '__fieldType',
      columns: [
        ...columnTotals.map(({ numericValue, ...column }) => ({
          ...column,
          share: numUtils.formatShareLabel(numericValue, percentageBase),
          value: valueFormatter(numericValue),
        })),
        {
          i18nTitle: '__fieldTotal',
          isTotal: true,
          share: numUtils.formatShareLabel(percentageBase, percentageBase),
          value: valueFormatter(totalValue),
        },
      ],
      rows,
      totalRow: {
        i18nTitle: '__fieldTotal',
        cells: columnTotals.map(column => valueFormatter(column.numericValue)),
        total: valueFormatter(totalValue),
      },
    },
  ];
};

class UsageKpiDetailsHelper {
  /**
   * Builds KPI detail rows for estimated-cost breakdowns.
   *
   * @param {Object} options
   * @param {string[]} [options.datasetTypes] - Dataset types to include in the breakdown. Defaults to all token dataset types.
   * @param {Object} [options.metricTotals={}] - Aggregated usage metrics containing estimated-cost fields.
   * @param {number} [options.percentageTotal] - Optional denominator for percentage calculation. Defaults to the sum of included estimated-cost fields.
   * @returns {{ datasetType: string, i18nTitle: string, share: string, value: string }[]} KPI detail rows with formatted cost and percentage values.
   */
  static buildEstimatedCostDetails({
    datasetTypes,
    metricTotals,
    percentageTotal,
  } = {}) {
    return buildKpiDetails({
      datasetTypes,
      metricFieldKey: 'estimatedCostField',
      metricTotals,
      percentageTotal,
      valueFormatter: value => `$${numUtils.format(value, 2)}`,
    });
  }

  /**
   * Builds KPI detail rows for token-count breakdowns.
   *
   * @param {Object} options
   * @param {string[]} [options.datasetTypes] - Dataset types to include in the breakdown. Defaults to all token dataset types.
   * @param {Object} [options.metricTotals={}] - Aggregated usage metrics containing token-count fields.
   * @param {number} [options.percentageTotal] - Optional denominator for percentage calculation. Defaults to the sum of included token-count fields.
   * @returns {{ datasetType: string, i18nTitle: string, share: string, value: string }[]} KPI detail rows with formatted token count and percentage values.
   */
  static buildTokenDetails({
    datasetTypes,
    metricTotals,
    percentageTotal,
  } = {}) {
    return buildKpiDetails({
      datasetTypes,
      metricFieldKey: 'tokenCountField',
      metricTotals,
      percentageTotal,
      valueFormatter: value => numUtils.format(value),
    });
  }

  /**
   * Builds a token-type cross breakdown for KPI details.
   *
   * @param {Object} options
   * @param {{ i18nTitle: string, metricTotals: Object }[]} [options.columns=[]] - Breakdown columns containing metric totals.
   * @param {string[]} [options.datasetTypes] - Dataset types to include in the row order. Defaults to all token dataset types.
   * @param {number} [options.percentageTotal] - Optional denominator for column-share calculation. Defaults to the sum of included columns.
   * @param {(value: number) => string} [options.valueFormatter] - Formats each numeric cell value.
   * @returns {{ type: string, columns: Object[], rows: Object[], totalRow: Object }[]} KPI breakdown detail payload.
   */
  static buildTokenBreakdownDetails({
    columns,
    datasetTypes,
    percentageTotal,
    valueFormatter = metricValue => numUtils.format(metricValue),
  } = {}) {
    return buildKpiBreakdownDetails({
      columns,
      datasetTypes,
      metricFieldKey: 'tokenCountField',
      percentageTotal,
      valueFormatter,
    });
  }

  /**
   * Builds an estimated-cost cross breakdown for KPI details.
   *
   * @param {Object} options
   * @param {{ i18nTitle: string, metricTotals: Object }[]} [options.columns=[]] - Breakdown columns containing metric totals.
   * @param {string[]} [options.datasetTypes] - Dataset types to include in the row order. Defaults to all token dataset types.
   * @param {number} [options.percentageTotal] - Optional denominator for column-share calculation. Defaults to the sum of included columns.
   * @param {(value: number) => string} [options.valueFormatter] - Formats each numeric cell value.
   * @returns {{ type: string, columns: Object[], rows: Object[], totalRow: Object }[]} KPI breakdown detail payload.
   */
  static buildEstimatedCostBreakdownDetails({
    columns,
    datasetTypes,
    percentageTotal,
    valueFormatter = value => `$${numUtils.format(value, 2)}`,
  } = {}) {
    return buildKpiBreakdownDetails({
      columns,
      datasetTypes,
      metricFieldKey: 'estimatedCostField',
      percentageTotal,
      valueFormatter,
    });
  }
}

export default UsageKpiDetailsHelper;
