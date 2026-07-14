import { ResourceConstant, UsageConstant } from '~/constants';
import UsageDataHelper from './UsageDataHelper';
import UsageEntityDataHelper from './UsageEntityDataHelper';

/**
 * @import { UsageBreakdownRow } from './UsageMetric.d'
 */

const AGENT_ENTITY_KEY = 'agentId';
const AGENT_ENTITY_NAME_KEY = 'agentName';
const AGENT_INVOCATION_COUNT_KEY = 'sessions';
const AGENT_USER_COUNT_KEY = 'users';
const AGENT_AVG_COST_KEY = 'avgCostPerSession';
const AGENT_ENTITY_COUNT_KEY = 'agentCount';
const AGENT_TOTAL_INVOCATION_COUNT_KEY = 'totalSessions';

/**
 * Checks whether a usage row belongs to session-name generation.
 *
 * @param {Object} [row={}] - The normalized usage row to inspect.
 * @returns {boolean} Whether the row is a session naming row.
 */
const isSessionNamingRow = (row = {}) => row.source === UsageConstant.SourceType.CHAT_SESSION_NAME.value;

/**
 * Builds a set of distinct session ids from usage rows.
 *
 * @param {Object[]} [rows=[]] - Usage rows containing session ids.
 * @returns {Set<string>} The distinct session ids found in the rows.
 */
const buildSessionIdSet = rows => new Set(
  (Array.isArray(rows) ? rows : [])
    .map(row => row.sessionId)
    .filter(Boolean),
);

/**
 * Resolves an agent or workflow resource from usage row identifiers.
 *
 * @param {Object} options
 * @param {string} [options.agentId] - The agent id to use when no workflow id exists.
 * @param {string} [options.workflowId] - The workflow id, which takes precedence over agent id.
 * @returns {{ id: string, resourceType: string } | null} The resolved resource, or null when no id exists.
 */
const getResource = ({
  agentId,
  workflowId,
} = {}) => {
  const id = workflowId || agentId;

  if (!id) {
    return null;
  }

  return {
    id,
    resourceType: workflowId ? ResourceConstant.Type.WORKFLOW.value : ResourceConstant.Type.AGENT.value,
  };
};

/**
 * Resolves the resource delegated by a direct agent run.
 *
 * @param {Object} [row={}] - The delegated-resource usage row.
 * @returns {{ id: string, resourceType: string } | null} The delegated resource.
 */
const getDelegatedResource = (row = {}) => getResource({
  agentId: row.agentId,
  workflowId: row.workflowId,
});

/**
 * Resolves the resource that called the current agent.
 *
 * @param {Object} [row={}] - The called-agent usage row.
 * @returns {{ id: string, resourceType: string } | null} The caller resource.
 */
const getCallerResource = (row = {}) => getResource({
  agentId: row.originalAgentId,
  workflowId: row.originalWorkflowId,
});

/**
 * Aggregates raw daily agent usage rows by agent and model, then enriches them with metric fields.
 *
 * @param {Object} options
 * @param {Object[]} [options.dailyAgentUsageRows=[]] - Normalized daily agent usage rows.
 * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
 * @returns {Object[]} Agent-model usage rows with token totals and estimated cost fields.
 */
const buildAgentsModelUsageRows = ({
  dailyAgentUsageRows = [],
  pricingTable = {},
} = {}) => UsageEntityDataHelper.buildEntityModelUsageRows({
  rows: dailyAgentUsageRows,
  pricingTable,
  entityKey: AGENT_ENTITY_KEY,
});

/**
 * Builds donut rows for the direct-run resource breakdown, keeping the current agent first.
 *
 * @param {Object} options
 * @param {UsageBreakdownRow} [options.selfAgentRow] - The current-agent row.
 * @param {UsageBreakdownRow[]} [options.calledResourceRows] - Delegated resource rows.
 * @param {string} options.sortKey - The metric key used to sort delegated resources.
 * @returns {UsageBreakdownRow[]} Donut rows with the current agent first and delegated resources sorted by metric.
 */
const buildAgentDirectRunResourceDonutRows = ({
  selfAgentRow,
  calledResourceRows,
  sortKey,
} = {}) => {
  const donutRows = [
    selfAgentRow,
    ...(calledResourceRows ?? []),
  ].filter(row => row && (row.totalTokens > 0 || row.estimatedCost > 0));
  const selfAgentRows = donutRows.filter(row => row.rowType === UsageConstant.RowType.SELF_AGENT.value);
  const resourceRows = donutRows
    .filter(row => row.rowType !== UsageConstant.RowType.SELF_AGENT.value)
    .sort((left, right) => Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0));

  return [
    ...selfAgentRows,
    ...resourceRows,
  ];
};

/**
 * Builds KPI summary totals for an agent usage overview tab.
 *
 * @param {Object} [agentUsageData={}] - The normalized agent usage data.
 * @returns {{ estimatedCost: number, sessions: number, totalTokens: number }} The agent overview totals.
 */
const buildAgentOverviewSummary = (agentUsageData = {}) => ({
  estimatedCost: Number(agentUsageData.agentDirectRunEstimatedCost ?? 0)
    + Number(agentUsageData.agentCallerEstimatedCost ?? 0)
    + Number(agentUsageData.sessionNamingEstimatedCost ?? 0),
  sessions: UsageDataHelper.countDistinct(agentUsageData.agentSelfRows, 'sessionId'),
  totalTokens: UsageDataHelper.sumUsageMetricTotals(agentUsageData.agentSelfRows).totalTokens,
});

class UsageAgentDataHelper {
  /**
   * Builds continuous daily session rows for the agents usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailySessionsRows=[]] - Normalized daily session rows.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {Object[]} The continuous daily session rows for the selected date range.
   */
  static buildDailySessionChartRows({
    dailySessionsRows = [],
    startDate,
    endDate,
  }) {
    const safeRows = Array.isArray(dailySessionsRows) ? dailySessionsRows : [];
    const rowsByDate = new Map(
      safeRows.map(row => [
        row.date,
        Number(row.sessionCount ?? 0),
      ]),
    );

    return UsageDataHelper.fillMissingDateRows({
      startDate,
      endDate,
      rowsByDate,
      createRow(date, sessionCount) {
        return {
          date,
          sessionCount: Number(sessionCount ?? 0),
        };
      },
    });
  }

  /**
   * Builds model distribution rows for the agents usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyAgentUsageRows=[]] - Normalized daily agent usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} Model-level rows sorted by token usage.
   */
  static buildAgentsModelBreakdownRows({
    dailyAgentUsageRows = [],
    pricingTable = {},
  } = {}) {
    return UsageDataHelper.buildModelBreakdownRows({
      rows: buildAgentsModelUsageRows({
        dailyAgentUsageRows,
        pricingTable,
      }),
    });
  }

  /**
   * Builds table rows for the agents usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyAgentUsageRows=[]] - Normalized daily agent usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {Object[]} [options.agentsSessionsAndUsersRows=[]] - Agent-level session and user count rows.
   * @param {(agentId: string) => string} [options.getAgentDisplayName] - Resolves the label for an agent id.
   * @param {string[]} [options.reservedAgentIds] - Agent ids that are never treated as deleted even when the name cannot be resolved.
   * @returns {Object[]} Agent table rows sorted by token usage.
   */
  static buildAgentsUsageTableItems({
    dailyAgentUsageRows = [],
    agentsSessionsAndUsersRows = [],
    pricingTable = {},
    getAgentDisplayName = agentId => agentId,
    reservedAgentIds = [],
  } = {}) {
    return UsageEntityDataHelper.buildEntityUsageTableItems({
      rows: dailyAgentUsageRows,
      countRows: agentsSessionsAndUsersRows,
      pricingTable,
      entityKey: AGENT_ENTITY_KEY,
      entityNameKey: AGENT_ENTITY_NAME_KEY,
      invocationCountKey: AGENT_INVOCATION_COUNT_KEY,
      userCountKey: AGENT_USER_COUNT_KEY,
      avgCostKey: AGENT_AVG_COST_KEY,
      getEntityDisplayName: getAgentDisplayName,
      reservedEntityIds: reservedAgentIds,
    });
  }

  /**
   * Builds KPI summary totals for the agents usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyAgentUsageRows=[]] - Normalized daily agent usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {Object[]} [options.agentsSessionsAndUsersRows=[]] - Agent-level session and user count rows.
   * @returns {{ agentCount: number, estimatedCost: number, totalSessions: number, totalTokens: number }} The agents overview totals.
   */
  static buildAgentsUsageSummary({
    dailyAgentUsageRows = [],
    agentsSessionsAndUsersRows = [],
    pricingTable = {},
  } = {}) {
    return UsageEntityDataHelper.buildEntityUsageSummary({
      rows: dailyAgentUsageRows,
      countRows: agentsSessionsAndUsersRows,
      pricingTable,
      entityKey: AGENT_ENTITY_KEY,
      entityCountKey: AGENT_ENTITY_COUNT_KEY,
      totalCountKey: AGENT_TOTAL_INVOCATION_COUNT_KEY,
      invocationCountKey: AGENT_INVOCATION_COUNT_KEY,
    });
  }

  /**
   * Normalizes agent usage rows into direct-run, caller, naming, and delegated buckets.
   *
   * @param {Object} options
   * @param {string} options.agentId - The current agent id.
   * @param {Object[]} [options.agentOriginalUsageRows=[]] - Rows where the current agent started the original run.
   * @param {Object[]} [options.agentUsageRows=[]] - Rows where the current agent consumed tokens.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object} Agent usage rows and estimated cost totals by bucket.
   */
  static buildAgentUsageData({
    agentId,
    agentOriginalUsageRows = [],
    agentUsageRows = [],
    pricingTable = {},
  } = {}) {
    const agentSelfRows = UsageDataHelper.buildUsageMetricRows({
      pricingTable,
      rows: agentUsageRows,
    });
    const agentDelegatedResourceRows = UsageDataHelper.buildUsageMetricRows({
      pricingTable,
      rows: (Array.isArray(agentOriginalUsageRows) ? agentOriginalUsageRows : [])
        .filter(row => row.agentId !== agentId),
    });
    const sessionNamingRows = agentSelfRows.filter(isSessionNamingRow);
    const nonSessionNamingRows = agentSelfRows.filter(row => !isSessionNamingRow(row));
    const agentDirectRunRows = nonSessionNamingRows.filter(row => row.originalAgentId === agentId);
    const agentCallerRows = nonSessionNamingRows.filter(row => row.originalAgentId !== agentId);
    const directRunSessionIds = buildSessionIdSet(agentDirectRunRows);
    const callerSessionIds = buildSessionIdSet(agentCallerRows);
    const sessionNamingDirectRunRows = sessionNamingRows.filter(row => directRunSessionIds.has(row.sessionId));
    const sessionNamingCallerRows = sessionNamingRows.filter(row => callerSessionIds.has(row.sessionId));

    return {
      agentDirectRunRows,
      agentCallerRows,
      sessionNamingRows,
      sessionNamingDirectRunRows,
      sessionNamingCallerRows,
      agentSelfRows,
      agentDelegatedResourceRows,
      agentDirectRunEstimatedCost: UsageDataHelper.sumEstimatedCost(agentDirectRunRows),
      agentDelegatedResourceEstimatedCost: UsageDataHelper.sumEstimatedCost(agentDelegatedResourceRows),
      agentCallerEstimatedCost: UsageDataHelper.sumEstimatedCost(agentCallerRows),
      sessionNamingDirectRunEstimatedCost: UsageDataHelper.sumEstimatedCost(sessionNamingDirectRunRows),
      sessionNamingCallerEstimatedCost: UsageDataHelper.sumEstimatedCost(sessionNamingCallerRows),
      sessionNamingEstimatedCost: UsageDataHelper.sumEstimatedCost(sessionNamingRows),
    };
  }

  /**
   * Builds all derived data for an agent usage overview tab.
   *
   * @param {Object} options
   * @param {Object} [options.agentUsageData={}] - The normalized agent usage data.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {{ dailyUsageRows: Object[], modelBreakdownRows: Object[], summary: Object }} The overview tab data.
   */
  static buildAgentOverviewUsageData({
    agentUsageData = {},
    startDate,
    endDate,
  } = {}) {
    const overviewUsageRows = agentUsageData.agentSelfRows ?? [];

    return {
      dailyUsageRows: UsageDataHelper.buildDailyUsageRows({
        rows: overviewUsageRows,
        startDate,
        endDate,
      }),
      modelBreakdownRows: UsageDataHelper.buildModelBreakdownRows({
        rows: overviewUsageRows,
      }),
      summary: buildAgentOverviewSummary(agentUsageData),
    };
  }

  /**
   * Builds the direct-run tab breakdown for current-agent usage and delegated resources.
   *
   * @param {Object} [agentUsageData={}] - The normalized agent usage data.
   * @returns {Object} Direct-run KPI, donut, and table rows containing UsageBreakdownRow collections.
   */
  static buildAgentDirectRunResourceBreakdown(agentUsageData = {}) {
    const directRunRows = [
      ...(agentUsageData.agentDirectRunRows ?? []),
      ...(agentUsageData.sessionNamingDirectRunRows ?? []),
    ];
    const directRunMetricTotals = UsageDataHelper.sumUsageMetricTotals(directRunRows);
    const directRuns = UsageDataHelper.countDistinct(agentUsageData.agentDirectRunRows, 'sessionId');
    const selfAgentRow = {
      ...directRunMetricTotals,
      invocations: directRuns,
      id: 'self-agent',
      i18nLabel: '__fieldUsageSelfAgent',
      resourceId: agentUsageData.agentDirectRunRows?.[0]?.agentId ?? null,
      resourceType: ResourceConstant.Type.AGENT.value,
      rowType: UsageConstant.RowType.SELF_AGENT.value,
      usageRows: directRunRows,
    };
    const calledResourceRowsById = new Map();

    (agentUsageData.agentDelegatedResourceRows ?? []).forEach((row) => {
      const resource = getDelegatedResource(row);

      if (!resource) {
        return;
      }

      const key = `${resource.resourceType}:${resource.id}`;
      const item = calledResourceRowsById.get(key) ?? {
        id: key,
        invocationIds: new Set(),
        resourceId: resource.id,
        resourceType: resource.resourceType,
        usageRows: [],
      };
      const invocationId = resource.resourceType === ResourceConstant.Type.WORKFLOW.value ? row.executionId : row.sessionId;

      if (invocationId) {
        item.invocationIds.add(invocationId);
      }

      item.usageRows.push(row);
      calledResourceRowsById.set(key, item);
    });

    const calledResourceRows = [...calledResourceRowsById.values()]
      .map((item) => {
        const metricTotals = UsageDataHelper.sumUsageMetricTotals(item.usageRows);

        return {
          ...metricTotals,
          id: item.id,
          invocations: item.invocationIds.size,
          resourceId: item.resourceId,
          resourceType: item.resourceType,
          rowType: UsageConstant.RowType.CALLED_RESOURCE.value,
          usageRows: item.usageRows,
        };
      })
      .sort((left, right) => right.estimatedCost - left.estimatedCost);
    const calledResourcesMetricTotals = UsageDataHelper.sumUsageMetricTotals(calledResourceRows);
    const calledResourcesSubtotalRow = {
      ...calledResourcesMetricTotals,
      estimatedCost: Number(agentUsageData.agentDelegatedResourceEstimatedCost ?? calledResourcesMetricTotals.estimatedCost),
      id: 'called-resources-subtotal',
      invocations: calledResourceRows.reduce((sum, row) => sum + Number(row.invocations ?? 0), 0),
      i18nLabel: '__fieldUsageDelegatedSubtotal',
      rowType: UsageConstant.RowType.SUBTOTAL.value,
    };
    const totalRowMetricTotals = UsageDataHelper.sumUsageMetricTotals([
      selfAgentRow,
      calledResourcesSubtotalRow,
    ]);
    const totalRow = {
      ...totalRowMetricTotals,
      estimatedCost: selfAgentRow.estimatedCost + calledResourcesSubtotalRow.estimatedCost,
      id: 'direct-runs-total',
      invocations: selfAgentRow.invocations + calledResourcesSubtotalRow.invocations,
      i18nLabel: '__fieldTotal',
      rowType: UsageConstant.RowType.TOTAL.value,
      totalTokens: selfAgentRow.totalTokens + calledResourcesSubtotalRow.totalTokens,
    };
    const averageFullFlowEstimatedCost = directRuns > 0 ? totalRow.estimatedCost / directRuns : 0;
    const tokenDonutRows = buildAgentDirectRunResourceDonutRows({
      selfAgentRow,
      calledResourceRows,
      sortKey: UsageConstant.MetricField.TOTAL_TOKENS.value,
    });
    const estimatedCostDonutRows = buildAgentDirectRunResourceDonutRows({
      selfAgentRow,
      calledResourceRows,
      sortKey: UsageConstant.MetricField.ESTIMATED_COST.value,
    });

    return {
      averageFullFlowEstimatedCost,
      calledResourceRows,
      calledResourcesSubtotalRow,
      fullFlowEstimatedCost: totalRow.estimatedCost,
      fullFlowTotalTokens: totalRow.totalTokens,
      estimatedCostDonutRows,
      directRuns,
      selfAgentRow,
      tableRows: [
        selfAgentRow,
        calledResourcesSubtotalRow,
        ...calledResourceRows,
        totalRow,
      ],
      tokenDonutRows,
      totalRow,
    };
  }

  /**
   * Builds the caller tab breakdown for resources that invoked the current agent.
   *
   * @param {Object} [agentUsageData={}] - The normalized agent usage data.
   * @returns {Object} Caller KPI and table rows containing UsageBreakdownRow collections.
   */
  static buildAgentCallerBreakdown(agentUsageData = {}) {
    const callerRowsById = new Map();

    (agentUsageData.agentCallerRows ?? []).forEach((row) => {
      const resource = getCallerResource(row);

      if (!resource) {
        return;
      }

      const key = `${resource.resourceType}:${resource.id}`;
      const item = callerRowsById.get(key) ?? {
        id: key,
        resourceId: resource.id,
        resourceType: resource.resourceType,
        usageRows: [],
        sessionIds: new Set(),
      };

      if (row.sessionId) {
        item.sessionIds.add(row.sessionId);
      }

      item.usageRows.push(row);
      callerRowsById.set(key, item);
    });

    const callerRows = [...callerRowsById.values()]
      .map((item) => {
        const namingRows = (agentUsageData.sessionNamingCallerRows ?? [])
          .filter(row => item.sessionIds.has(row.sessionId));
        const metricTotals = UsageDataHelper.sumUsageMetricTotals([
          ...item.usageRows,
          ...namingRows,
        ]);

        return {
          ...metricTotals,
          id: item.id,
          invocations: item.sessionIds.size,
          resourceId: item.resourceId,
          resourceType: item.resourceType,
          rowType: UsageConstant.RowType.CALLER_RESOURCE.value,
          usageRows: [
            ...item.usageRows,
            ...namingRows,
          ],
        };
      })
      .sort((left, right) => right.estimatedCost - left.estimatedCost);
    const metricTotals = UsageDataHelper.sumUsageMetricTotals(callerRows);
    const totalTokens = metricTotals.totalTokens;
    const calls = callerRows.reduce((sum, row) => sum + Number(row.invocations ?? 0), 0);
    const estimatedCost = Number(agentUsageData.agentCallerEstimatedCost ?? 0)
      + Number(agentUsageData.sessionNamingCallerEstimatedCost ?? 0);
    const totalRow = {
      ...metricTotals,
      estimatedCost,
      id: 'caller-total',
      invocations: calls,
      i18nLabel: '__fieldTotal',
      rowType: UsageConstant.RowType.TOTAL.value,
      totalTokens,
    };
    const averageEstimatedCostPerCall = calls > 0 ? estimatedCost / calls : 0;

    return {
      averageEstimatedCostPerCall,
      callerRows,
      estimatedCost,
      totalTokens,
      calls,
      tableRows: [
        ...callerRows,
        totalRow,
      ],
      totalRow,
    };
  }
}

export default UsageAgentDataHelper;
