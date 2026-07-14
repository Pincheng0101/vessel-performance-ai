import UsageDataHelper from './UsageDataHelper';

class UsageEntityDataHelper {
  /**
   * Builds entity usage metric rows and keeps rows that can be grouped by entity and model.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.entityKey - The entity key in a usage row (for example, `agentId` or `workflowId`).
   * @returns {Object[]} Entity usage metric rows with entity and model identifiers.
   */
  static buildEntityMetricRows({
    rows = [],
    pricingTable = {},
    entityKey,
  } = {}) {
    if (!entityKey) {
      return [];
    }

    return UsageDataHelper.buildUsageMetricRows({
      rows,
      pricingTable,
    }).filter(row => row[entityKey] && row.model);
  }

  /**
   * Aggregates raw usage rows by entity and model, then enriches them with metric fields.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.entityKey - The entity key in a usage row.
   * @returns {Object[]} Entity-model usage rows with token totals and estimated cost fields.
   */
  static buildEntityModelUsageRows({
    rows = [],
    pricingTable = {},
    entityKey,
  } = {}) {
    const metricRows = this.buildEntityMetricRows({
      rows,
      pricingTable,
      entityKey,
    });
    const rowsByEntity = new Map();

    metricRows.forEach((row) => {
      const entityId = row[entityKey];
      const rowsByModel = rowsByEntity.get(entityId) ?? new Map();
      const item = rowsByModel.get(row.model) ?? {
        [entityKey]: entityId,
        model: row.model,
        usageRows: [],
      };

      item.usageRows.push(row);
      rowsByModel.set(row.model, item);
      rowsByEntity.set(entityId, rowsByModel);
    });

    return [...rowsByEntity.values()]
      .flatMap(rowsByModel => [...rowsByModel.values()])
      .map(({ usageRows, ...row }) => ({
        ...row,
        ...UsageDataHelper.sumUsageMetricTotals(usageRows),
      }));
  }

  /**
   * Groups entity usage metric rows and merges entity-level invocation/user counts.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows.
   * @param {Object[]} [options.countRows=[]] - Entity-level count rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.entityKey - The entity key in usage rows.
   * @param {string} options.entityNameKey - The entity name field key in grouped rows.
   * @param {string} options.invocationCountKey - The invocation count field key in grouped rows.
   * @param {string} options.userCountKey - The user count field key in grouped rows.
   * @param {(entityId: string) => string} [options.getEntityDisplayName] - Resolves the display name for an entity id.
   * @param {string[]} [options.reservedEntityIds] - Entity ids that are never treated as deleted even when the name cannot be resolved.
   * @returns {Object[]} Entity groups containing usage rows and entity-level counts.
   */
  static buildEntityUsageGroups({
    rows = [],
    countRows = [],
    pricingTable = {},
    entityKey,
    entityNameKey,
    invocationCountKey,
    userCountKey,
    getEntityDisplayName = entityId => entityId,
    reservedEntityIds = [],
  } = {}) {
    const metricRows = this.buildEntityMetricRows({
      rows,
      pricingTable,
      entityKey,
    });
    const rowsByEntity = new Map();
    const resolveGroup = (entityId) => {
      const displayName = getEntityDisplayName(entityId);
      const group = rowsByEntity.get(entityId) ?? {
        [entityKey]: entityId,
        [entityNameKey]: displayName,
        isDeleted: entityId && displayName === entityId && !reservedEntityIds.includes(entityId),
        [invocationCountKey]: 0,
        usageRows: [],
        [userCountKey]: 0,
      };

      rowsByEntity.set(entityId, group);
      return group;
    };

    metricRows.forEach((row) => {
      resolveGroup(row[entityKey]).usageRows.push(row);
    });

    (Array.isArray(countRows) ? countRows : []).forEach((row) => {
      const entityId = row[entityKey];

      if (!entityId) {
        return;
      }

      const group = resolveGroup(entityId);

      group[invocationCountKey] = Number(row[invocationCountKey] ?? 0);
      group[userCountKey] = Number(row[userCountKey] ?? 0);
    });

    return [...rowsByEntity.values()];
  }

  /**
   * Builds table rows for an entity usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows.
   * @param {Object[]} [options.countRows=[]] - Entity-level count rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.entityKey - The entity key in usage rows.
   * @param {string} options.entityNameKey - The entity name field key in grouped rows.
   * @param {string} options.invocationCountKey - The invocation count field key in grouped rows.
   * @param {string} options.userCountKey - The user count field key in grouped rows.
   * @param {string} options.avgCostKey - The average-cost field key to emit in table rows.
   * @param {(entityId: string) => string} [options.getEntityDisplayName] - Resolves the display name for an entity id.
   * @param {string[]} [options.reservedEntityIds] - Entity ids that are never treated as deleted even when the name cannot be resolved.
   * @returns {Object[]} Entity table rows sorted by token usage.
   */
  static buildEntityUsageTableItems({
    rows = [],
    countRows = [],
    pricingTable = {},
    entityKey,
    entityNameKey,
    invocationCountKey,
    userCountKey,
    avgCostKey,
    getEntityDisplayName = entityId => entityId,
    reservedEntityIds = [],
  } = {}) {
    return this.buildEntityUsageGroups({
      rows,
      countRows,
      pricingTable,
      entityKey,
      entityNameKey,
      invocationCountKey,
      userCountKey,
      getEntityDisplayName,
      reservedEntityIds,
    })
      .map(({ usageRows, ...row }) => {
        const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(usageRows);
        const invocationCount = Number(row[invocationCountKey] ?? 0);

        return {
          ...row,
          ...usageMetricTotals,
          [avgCostKey]: invocationCount > 0 ? usageMetricTotals.estimatedCost / invocationCount : 0,
        };
      })
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  /**
   * Builds KPI summary totals for an entity usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized usage rows.
   * @param {Object[]} [options.countRows=[]] - Entity-level count rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {string} options.entityKey - The entity key in usage rows.
   * @param {string} options.entityCountKey - The entity count key in summary output.
   * @param {string} options.totalCountKey - The total invocation count key in summary output.
   * @param {string} options.invocationCountKey - The invocation count key used in count rows.
   * @returns {Object} The overview summary totals, including token and estimated-cost breakdown fields.
   */
  static buildEntityUsageSummary({
    rows = [],
    countRows = [],
    pricingTable = {},
    entityKey,
    entityCountKey,
    totalCountKey,
    invocationCountKey,
  } = {}) {
    const metricRows = this.buildEntityMetricRows({
      rows,
      pricingTable,
      entityKey,
    });
    const safeCountRows = Array.isArray(countRows) ? countRows : [];
    const validCountRows = safeCountRows.filter(row => row?.[entityKey]);
    const usageMetricTotals = UsageDataHelper.sumUsageMetricTotals(metricRows);

    return {
      ...usageMetricTotals,
      [entityCountKey]: validCountRows.length,
      [totalCountKey]: validCountRows.reduce((sum, row) => sum + Number(row[invocationCountKey] ?? 0), 0),
    };
  }
}

export default UsageEntityDataHelper;
