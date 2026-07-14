import dayjs from 'dayjs';
import { DateConstant, UsageConstant } from '~/constants';

/**
 * @import { UsageMetricRow, UsageMetricTotals } from './UsageMetric.d'
 */

/**
 * Creates a fresh zero-valued UsageMetricTotals object.
 *
 * @returns {UsageMetricTotals} Empty usage metric totals.
 */
const createEmptyUsageMetricTotals = () => ({
  estimatedCacheReadInputCost: 0,
  estimatedCacheWriteInputCost: 0,
  estimatedCost: 0,
  estimatedInputCost: 0,
  estimatedOutputCost: 0,
  totalCacheReadInputTokens: 0,
  totalCacheWriteInputTokens: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
});

class UsageDataHelper {
  /**
   * Resolves model pricing from a pricing table.
   *
   * @param {Object} options
   * @param {string} options.model - The model name used to look up pricing.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {{ inputTokenPrice: number, outputTokenPrice: number, cacheReadTokenPrice: number, cacheWriteTokenPrice: number }} The pricing configuration for the given model, or the default pricing when no exact match exists.
   */
  static getModelPrice({
    model,
    pricingTable = {},
  }) {
    return pricingTable[model] ?? {
      inputTokenPrice: 0,
      outputTokenPrice: 0,
      cacheReadTokenPrice: 0,
      cacheWriteTokenPrice: 0,
    };
  }

  /**
   * Calculates token total from raw normalized token fields.
   *
   * @param {Object} [row={}] - A normalized usage row containing the token counts for each token type.
   * @returns {number} The total tokens across input, output, cache-read input, and cache-write input.
   */
  static calculateTotalTokensByRow(row = {}) {
    return Number(row.sumInputTokens ?? 0)
      + Number(row.sumOutputTokens ?? 0)
      + Number(row.sumCacheReadInputTokens ?? 0)
      + Number(row.sumCacheWriteInputTokens ?? 0);
  }

  /**
   * Calculates estimated cost for a row from model pricing and token counts.
   *
   * @param {Object} options
   * @param {string} options.model - The model name used to calculate estimated cost.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {number} [options.sumInputTokens=0] - The total input tokens for the row.
   * @param {number} [options.sumOutputTokens=0] - The total output tokens for the row.
   * @param {number} [options.sumCacheReadInputTokens=0] - The total cache-read input tokens for the row.
   * @param {number} [options.sumCacheWriteInputTokens=0] - The total cache-write input tokens for the row.
   * @returns {{ estimatedCost: number, estimatedCacheReadInputCost: number, estimatedCacheWriteInputCost: number, estimatedInputCost: number, estimatedOutputCost: number }} The estimated total cost and its token-type breakdown for the row.
   */
  static calculateEstimatedCostByRow({
    model,
    pricingTable = {},
    sumInputTokens = 0,
    sumOutputTokens = 0,
    sumCacheReadInputTokens = 0,
    sumCacheWriteInputTokens = 0,
  }) {
    const price = this.getModelPrice({
      model,
      pricingTable,
    });
    const estimatedInputCost = sumInputTokens * price.inputTokenPrice;
    const estimatedOutputCost = sumOutputTokens * price.outputTokenPrice;
    const estimatedCacheReadInputCost = sumCacheReadInputTokens * price.cacheReadTokenPrice;
    const estimatedCacheWriteInputCost = sumCacheWriteInputTokens * price.cacheWriteTokenPrice;

    return {
      estimatedCost: estimatedCacheReadInputCost + estimatedCacheWriteInputCost + estimatedInputCost + estimatedOutputCost,
      estimatedInputCost,
      estimatedOutputCost,
      estimatedCacheReadInputCost,
      estimatedCacheWriteInputCost,
    };
  }

  /**
   * Converts normalized usage rows into metric rows with canonical token and cost fields.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows to enrich.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {UsageMetricRow[]} The rows with canonical token totals and estimated cost fields.
   */
  static buildUsageMetricRows({
    rows = [],
    pricingTable = {},
  } = {}) {
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const totalInputTokens = Number(row.sumInputTokens ?? 0);
      const totalOutputTokens = Number(row.sumOutputTokens ?? 0);
      const totalCacheReadInputTokens = Number(row.sumCacheReadInputTokens ?? 0);
      const totalCacheWriteInputTokens = Number(row.sumCacheWriteInputTokens ?? 0);
      const estimatedCost = this.calculateEstimatedCostByRow({
        model: row.model,
        pricingTable,
        sumInputTokens: totalInputTokens,
        sumOutputTokens: totalOutputTokens,
        sumCacheReadInputTokens: totalCacheReadInputTokens,
        sumCacheWriteInputTokens: totalCacheWriteInputTokens,
      });

      return {
        ...row,
        estimatedCacheReadInputCost: estimatedCost.estimatedCacheReadInputCost,
        estimatedCacheWriteInputCost: estimatedCost.estimatedCacheWriteInputCost,
        estimatedCost: estimatedCost.estimatedCost,
        estimatedInputCost: estimatedCost.estimatedInputCost,
        estimatedOutputCost: estimatedCost.estimatedOutputCost,
        totalCacheReadInputTokens,
        totalCacheWriteInputTokens,
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalCacheReadInputTokens + totalCacheWriteInputTokens + totalInputTokens + totalOutputTokens,
      };
    });
  }

  /**
   * Sums canonical token and estimated-cost fields across metric rows.
   *
   * @param {UsageMetricRow[]} [rows=[]] - Usage metric rows containing total token and estimated cost fields.
   * @returns {UsageMetricTotals} The summed token and estimated cost totals.
   */
  static sumUsageMetricTotals(rows = []) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
      const totalInputTokens = Number(row.totalInputTokens ?? 0);
      const totalOutputTokens = Number(row.totalOutputTokens ?? 0);
      const totalCacheReadInputTokens = Number(row.totalCacheReadInputTokens ?? 0);
      const totalCacheWriteInputTokens = Number(row.totalCacheWriteInputTokens ?? 0);
      const estimatedInputCost = Number(row.estimatedInputCost ?? 0);
      const estimatedOutputCost = Number(row.estimatedOutputCost ?? 0);
      const estimatedCacheReadInputCost = Number(row.estimatedCacheReadInputCost ?? 0);
      const estimatedCacheWriteInputCost = Number(row.estimatedCacheWriteInputCost ?? 0);
      const totalTokens = Number(
        row.totalTokens
        ?? (
          totalInputTokens
          + totalOutputTokens
          + totalCacheReadInputTokens
          + totalCacheWriteInputTokens
        ),
      );
      const estimatedCost = Number(
        row.estimatedCost
        ?? (
          estimatedInputCost
          + estimatedOutputCost
          + estimatedCacheReadInputCost
          + estimatedCacheWriteInputCost
        ),
      );

      return {
        totalCacheReadInputTokens: sum.totalCacheReadInputTokens + totalCacheReadInputTokens,
        totalCacheWriteInputTokens: sum.totalCacheWriteInputTokens + totalCacheWriteInputTokens,
        totalInputTokens: sum.totalInputTokens + totalInputTokens,
        totalOutputTokens: sum.totalOutputTokens + totalOutputTokens,
        totalTokens: sum.totalTokens + totalTokens,
        estimatedCacheReadInputCost: sum.estimatedCacheReadInputCost + estimatedCacheReadInputCost,
        estimatedCacheWriteInputCost: sum.estimatedCacheWriteInputCost + estimatedCacheWriteInputCost,
        estimatedInputCost: sum.estimatedInputCost + estimatedInputCost,
        estimatedOutputCost: sum.estimatedOutputCost + estimatedOutputCost,
        estimatedCost: sum.estimatedCost + estimatedCost,
      };
    }, createEmptyUsageMetricTotals());
  }

  /**
   * Sums estimated cost across usage rows.
   *
   * @param {Object[]} [rows=[]] - Usage rows containing estimated cost fields.
   * @returns {number} The summed estimated cost.
   */
  static sumEstimatedCost(rows = []) {
    return (Array.isArray(rows) ? rows : []).reduce(
      (sum, row) => sum + Number(row.estimatedCost ?? 0),
      0,
    );
  }

  /**
   * Aggregates metric rows by model for model distribution charts.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Usage metric rows to aggregate by model.
   * @returns {Object[]} The model-level breakdown rows with total tokens and estimated cost.
   */
  static buildModelBreakdownRows({
    rows = [],
  } = {}) {
    const rowsByModel = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      if (!row.model) {
        return;
      }

      const item = rowsByModel.get(row.model) ?? {
        model: row.model,
        usageRows: [],
      };

      item.usageRows.push(row);
      rowsByModel.set(row.model, item);
    });

    return [...rowsByModel.values()]
      .map(({ usageRows, model }) => {
        const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(usageRows);

        return {
          estimatedCost: usageMetricTotals.estimatedCost,
          model,
          totalTokens: usageMetricTotals.totalTokens,
        };
      })
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds stacked chart datasets for token usage.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Aggregated usage rows containing token totals for each dataset type.
   * @param {string[]} [options.datasetTypes=[]] - The dataset types to include in stack order.
   * @returns {Object[]} The stacked datasets for token usage, split into input and output series.
   */
  static buildTokenStackDatasets({
    rows = [],
    datasetTypes = [
      UsageConstant.DatasetType.INPUT.value,
      UsageConstant.DatasetType.CACHE_READ_INPUT.value,
      UsageConstant.DatasetType.CACHE_WRITE_INPUT.value,
      UsageConstant.DatasetType.OUTPUT.value,
    ],
  }) {
    const safeRows = Array.isArray(rows) ? rows : [];

    return datasetTypes.map(datasetType => ({
      data: safeRows.map(row => Number(this.getTokenTotalByDatasetType({
        datasetType,
        row,
      }) ?? 0)),
      datasetType,
    }));
  }

  /**
   * Builds stacked chart datasets for estimated cost.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Aggregated usage rows containing estimated cost totals for each dataset type.
   * @param {string[]} [options.datasetTypes=[]] - The dataset types to include in stack order.
   * @returns {Object[]} The stacked datasets for estimated cost, split into input and output series.
   */
  static buildEstimatedCostStackDatasets({
    rows = [],
    datasetTypes = [
      UsageConstant.DatasetType.INPUT.value,
      UsageConstant.DatasetType.CACHE_READ_INPUT.value,
      UsageConstant.DatasetType.CACHE_WRITE_INPUT.value,
      UsageConstant.DatasetType.OUTPUT.value,
    ],
  }) {
    const safeRows = Array.isArray(rows) ? rows : [];

    return datasetTypes.map(datasetType => ({
      data: safeRows.map(row => Number(this.getEstimatedCostByDatasetType({
        datasetType,
        row,
      }) ?? 0)),
      datasetType,
    }));
  }

  /**
   * Resolves a token total by dataset type from an aggregated row.
   *
   * @param {Object} options
   * @param {string} options.datasetType - The dataset type to resolve from the aggregated row.
   * @param {Object} [options.row={}] - An aggregated usage row containing token totals by dataset type.
   * @returns {number} The token total for the requested dataset type, or 0 when the type is not recognized.
   */
  static getTokenTotalByDatasetType({
    datasetType,
    row = {},
  }) {
    switch (datasetType) {
      case UsageConstant.DatasetType.INPUT.value:
        return row.totalInputTokens;
      case UsageConstant.DatasetType.CACHE_READ_INPUT.value:
        return row.totalCacheReadInputTokens;
      case UsageConstant.DatasetType.CACHE_WRITE_INPUT.value:
        return row.totalCacheWriteInputTokens;
      case UsageConstant.DatasetType.OUTPUT.value:
        return row.totalOutputTokens;
      default:
        return 0;
    }
  }

  /**
   * Resolves an estimated cost by dataset type from an aggregated row.
   *
   * @param {Object} options
   * @param {string} options.datasetType - The dataset type to resolve from the aggregated row.
   * @param {Object} [options.row={}] - An aggregated usage row containing estimated cost totals by dataset type.
   * @returns {number} The estimated cost for the requested dataset type, or 0 when the type is not recognized.
   */
  static getEstimatedCostByDatasetType({
    datasetType,
    row = {},
  }) {
    switch (datasetType) {
      case UsageConstant.DatasetType.INPUT.value:
        return row.estimatedInputCost;
      case UsageConstant.DatasetType.CACHE_READ_INPUT.value:
        return row.estimatedCacheReadInputCost;
      case UsageConstant.DatasetType.CACHE_WRITE_INPUT.value:
        return row.estimatedCacheWriteInputCost;
      case UsageConstant.DatasetType.OUTPUT.value:
        return row.estimatedOutputCost;
      default:
        return 0;
    }
  }

  /**
   * Calculates total estimated cost from aggregated cost fields.
   *
   * @param {Object} [row={}] - An aggregated usage row containing estimated cost totals for each dataset type.
   * @returns {number} The total estimated cost across input, output, cache-read input, and cache-write input.
   */
  static calculateTotalEstimatedCostByRow(row = {}) {
    return Number(row.estimatedCacheReadInputCost ?? 0)
      + Number(row.estimatedCacheWriteInputCost ?? 0)
      + Number(row.estimatedInputCost ?? 0)
      + Number(row.estimatedOutputCost ?? 0);
  }

  /**
   * Aggregates metric rows into continuous daily usage rows.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Usage metric rows grouped into daily chart rows.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {Object[]} The date-level usage rows with token totals, estimated cost totals, and session counts.
   */
  static buildDailyUsageRows({
    rows = [],
    startDate,
    endDate,
  }) {
    const rowsByDate = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      if (!row.date) {
        return;
      }

      const item = rowsByDate.get(row.date) ?? {
        date: row.date,
        executionIds: new Set(),
        sessionIds: new Set(),
        usageRows: [],
      };

      item.usageRows.push(row);

      if (row.executionId) {
        item.executionIds.add(row.executionId);
      }

      if (row.sessionId) {
        item.sessionIds.add(row.sessionId);
      }

      rowsByDate.set(row.date, item);
    });

    return this.fillMissingDateRows({
      startDate,
      endDate,
      rowsByDate,
      createRow(date, row) {
        const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(row?.usageRows);

        return {
          date,
          estimatedCacheReadInputCost: usageMetricTotals.estimatedCacheReadInputCost,
          estimatedCacheWriteInputCost: usageMetricTotals.estimatedCacheWriteInputCost,
          estimatedInputCost: usageMetricTotals.estimatedInputCost,
          estimatedOutputCost: usageMetricTotals.estimatedOutputCost,
          executionCount: row?.executionIds?.size ?? 0,
          estimatedCost: usageMetricTotals.estimatedCost,
          sessionCount: row?.sessionIds?.size ?? 0,
          totalCacheReadInputTokens: usageMetricTotals.totalCacheReadInputTokens,
          totalCacheWriteInputTokens: usageMetricTotals.totalCacheWriteInputTokens,
          totalInputTokens: usageMetricTotals.totalInputTokens,
          totalOutputTokens: usageMetricTotals.totalOutputTokens,
          totalTokens: usageMetricTotals.totalTokens,
        };
      },
    });
  }

  /**
   * Builds continuous daily usage chart rows from normalized usage rows.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows to aggregate by date for the daily usage charts.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {Object[]} The date-level usage rows with token totals and estimated cost totals by dataset type.
   */
  static buildDailyUsageChartRows({
    rows = [],
    pricingTable = {},
    startDate,
    endDate,
  }) {
    return this.buildDailyUsageRows({
      rows: this.buildUsageMetricRows({
        rows,
        pricingTable,
      }),
      startDate,
      endDate,
    });
  }

  /**
   * Fills missing dates in a date-keyed row map.
   *
   * @param {Object} options
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @param {Map<string, Object | number>} [options.rowsByDate] - A date-keyed map of existing rows or values.
   * @param {(date: string, rowOrValue: Object | number | undefined) => Object} options.createRow - Builds the final row for each date.
   * @returns {Object[]} The continuous date rows between start and end date, including empty rows for missing dates.
   */
  static fillMissingDateRows({
    startDate,
    endDate,
    rowsByDate = new Map(),
    createRow,
  }) {
    if (!(rowsByDate instanceof Map) || typeof createRow !== 'function') {
      return [];
    }

    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');

    if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) {
      return [];
    }

    const dateRows = [];

    for (let cursor = start; cursor.isBefore(end) || cursor.isSame(end, 'day'); cursor = cursor.add(1, 'day')) {
      const date = cursor.format(DateConstant.Format.FULL_DATE);

      dateRows.push(createRow(date, rowsByDate.get(date)));
    }

    return dateRows;
  }

  /**
   * Counts distinct truthy values from a row key.
   *
   * @param {Object[]} [rows=[]] - Rows containing the target key.
   * @param {string} key - The row key to count distinct values for.
   * @returns {number} The number of distinct values.
   */
  static countDistinct(rows = [], key) {
    if (!key) {
      return 0;
    }

    return new Set(
      (Array.isArray(rows) ? rows : [])
        .map(row => row?.[key])
        .filter(Boolean),
    ).size;
  }
}

export default UsageDataHelper;
