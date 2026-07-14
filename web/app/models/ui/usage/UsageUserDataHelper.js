import { UsageConstant } from '~/constants';
import UsageDataHelper from './UsageDataHelper';

/**
 * Resolves which token bucket a user usage row belongs to.
 *
 * @param {Object} [row={}] - The normalized user usage row.
 * @returns {string} The token bucket for the row.
 */
const resolveTokenBucket = (row = {}) => {
  if (row.workflowId) {
    return UsageConstant.TokenType.RUN.value;
  }

  if (row.agentId) {
    return UsageConstant.TokenType.SESSION.value;
  }

  return UsageConstant.TokenType.OTHERS.value;
};

/**
 * Groups user usage metric rows by user and token bucket.
 *
 * @param {Object} options
 * @param {Object[]} [options.rows=[]] - Normalized user usage rows.
 * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
 * @returns {Object[]} User groups containing all usage rows and bucket-specific rows.
 */
const buildUsersUsageGroups = ({
  rows = [],
  pricingTable = {},
} = {}) => {
  const metricRows = UsageDataHelper.buildUsageMetricRows({
    rows,
    pricingTable,
  });
  const rowsByUser = new Map();

  metricRows.forEach((row) => {
    if (!row.user) {
      return;
    }

    const group = rowsByUser.get(row.user) ?? {
      runUsageRows: [],
      sessionUsageRows: [],
      usageRows: [],
      user: row.user,
    };

    group.usageRows.push(row);

    switch (resolveTokenBucket(row)) {
      case UsageConstant.TokenType.RUN.value:
        group.runUsageRows.push(row);
        break;
      case UsageConstant.TokenType.SESSION.value:
        group.sessionUsageRows.push(row);
        break;
      default:
        break;
    }

    rowsByUser.set(row.user, group);
  });

  return [...rowsByUser.values()];
};

/**
 * Checks whether a user usage row is not attributed to an agent or workflow.
 *
 * @param {Object} [row={}] - The normalized user usage row.
 * @returns {boolean} Whether the row belongs to platform-service usage.
 */
const isOthersUsageRow = (row = {}) => !row.agentId && !row.workflowId;

class UsageUserDataHelper {
  /**
   * Builds KPI summary totals for the users overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object} User count plus summed token and estimated-cost totals.
   */
  static buildUsersUsageSummary({
    rows = [],
    pricingTable = {},
  } = {}) {
    const userRows = this.buildUsersUsageChartRows({
      rows,
      pricingTable,
    });

    return {
      ...UsageDataHelper.sumUsageMetricTotals(userRows),
      userCount: userRows.length,
    };
  }

  /**
   * Builds user rows for stacked token and estimated-cost charts.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} User chart rows sorted by token usage.
   */
  static buildUsersUsageChartRows({
    rows = [],
    pricingTable = {},
  } = {}) {
    return buildUsersUsageGroups({
      rows,
      pricingTable,
    })
      .map(({ usageRows, user }) => ({
        user,
        ...UsageDataHelper.sumUsageMetricTotals(usageRows),
      }))
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds table rows for the users usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} User table rows sorted by total token usage.
   */
  static buildUsersUsageTableItems({
    rows = [],
    pricingTable = {},
  } = {}) {
    return buildUsersUsageGroups({
      rows,
      pricingTable,
    })
      .map(({
        runUsageRows,
        sessionUsageRows,
        usageRows,
        user,
      }) => {
        const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(usageRows);
        const runTokens = UsageDataHelper.sumUsageMetricTotals(runUsageRows).totalTokens;
        const sessionTokens = UsageDataHelper.sumUsageMetricTotals(sessionUsageRows).totalTokens;

        return {
          ...usageMetricTotals,
          otherTokens: usageMetricTotals.totalTokens - sessionTokens - runTokens,
          runTokens,
          sessionTokens,
          user,
        };
      })
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds KPI summary totals for a user detail page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user detail usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object} Resource counts plus summed token and estimated-cost totals.
   */
  static buildUserUsageSummary({
    rows = [],
    pricingTable = {},
  } = {}) {
    const metricRows = UsageDataHelper.buildUsageMetricRows({
      rows,
      pricingTable,
    });

    return {
      ...UsageDataHelper.sumUsageMetricTotals(metricRows),
      agentCount: UsageDataHelper.countDistinct(metricRows, 'agentId'),
      executionCount: UsageDataHelper.countDistinct(metricRows, 'executionId'),
      sessionCount: UsageDataHelper.countDistinct(metricRows, 'sessionId'),
      workflowCount: UsageDataHelper.countDistinct(metricRows, 'workflowId'),
    };
  }

  /**
   * Builds grouped usage rows for a user detail breakdown table.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user detail usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.groupKey - The row key used as the breakdown id.
   * @param {string} options.distinctKey - The row key used to count distinct invocations.
   * @returns {Object[]} User detail breakdown rows sorted by token usage.
   */
  static buildUserUsageBreakdownItems({
    rows = [],
    pricingTable = {},
    groupKey,
    distinctKey,
  } = {}) {
    const metricRows = UsageDataHelper.buildUsageMetricRows({
      rows,
      pricingTable,
    });
    const itemsById = new Map();

    metricRows.forEach((row) => {
      const breakdownId = row[groupKey];
      const distinctId = row[distinctKey];

      if (!breakdownId || !distinctId) {
        return;
      }

      const item = itemsById.get(breakdownId) ?? {
        usageRows: [],
        uniqueIds: new Set(),
      };

      item.usageRows.push(row);
      item.uniqueIds.add(distinctId);
      itemsById.set(breakdownId, item);
    });

    return [...itemsById.entries()]
      .map(([id, item]) => {
        const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(item.usageRows);

        return {
          averageCost: item.uniqueIds.size > 0 ? usageMetricTotals.estimatedCost / item.uniqueIds.size : 0,
          estimatedCost: usageMetricTotals.estimatedCost,
          id,
          totalTokens: usageMetricTotals.totalTokens,
          uniqueCount: item.uniqueIds.size,
          usageRows: item.usageRows,
        };
      })
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds source-level rows for non-agent, non-workflow usage on a user detail page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user detail usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} Source rows with total usage and expandable usage rows.
   */
  static buildUserOthersBreakdownItems({
    rows = [],
    pricingTable = {},
  } = {}) {
    const metricRows = UsageDataHelper.buildUsageMetricRows({
      rows,
      pricingTable,
    }).filter(isOthersUsageRow);
    const itemsBySource = new Map();

    metricRows.forEach((row) => {
      const source = row.source || '';
      const item = itemsBySource.get(source) ?? {
        source,
        usageRows: [],
      };

      item.usageRows.push(row);
      itemsBySource.set(source, item);
    });

    return [...itemsBySource.values()]
      .map(({ source, usageRows }) => ({
        id: source,
        source,
        usageRows,
        ...UsageDataHelper.sumUsageMetricTotals(usageRows),
      }))
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds model distribution rows for a user detail page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized user detail usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} Model-level rows sorted by token usage.
   */
  static buildUserModelBreakdownRows({
    rows = [],
    pricingTable = {},
  } = {}) {
    return UsageDataHelper.buildModelBreakdownRows({
      rows: UsageDataHelper.buildUsageMetricRows({
        rows,
        pricingTable,
      }),
    });
  }
}

export default UsageUserDataHelper;
