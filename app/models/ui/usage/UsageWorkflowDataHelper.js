import { ResourceConstant, UsageConstant } from '~/constants';
import UsageDataHelper from './UsageDataHelper';
import UsageEntityDataHelper from './UsageEntityDataHelper';

/**
 * @import { UsageBreakdownRow } from './UsageMetric.d'
 */

const WORKFLOW_ENTITY_KEY = 'workflowId';
const WORKFLOW_ENTITY_NAME_KEY = 'workflowName';
const WORKFLOW_INVOCATION_COUNT_KEY = 'executions';
const WORKFLOW_USER_COUNT_KEY = 'users';
const WORKFLOW_AVG_COST_KEY = 'avgCostPerExecution';
const WORKFLOW_ENTITY_COUNT_KEY = 'workflowCount';
const WORKFLOW_TOTAL_INVOCATION_COUNT_KEY = 'totalExecutions';

/**
 * Counts distinct truthy values from a specific row key.
 *
 * @param {Object[]} [rows=[]] - Rows containing the target key.
 * @param {string} key - The row key to count distinct values for.
 * @returns {number} The number of distinct truthy values.
 */
const countDistinct = (rows = [], key) => new Set(
  (Array.isArray(rows) ? rows : [])
    .map(row => row[key])
    .filter(Boolean),
).size;

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
 * Resolves the resource delegated by a direct workflow execution.
 *
 * @param {Object} [row={}] - The delegated-resource usage row.
 * @returns {{ id: string, resourceType: string } | null} The delegated resource.
 */
const getDelegatedResource = (row = {}) => getResource({
  agentId: row.agentId,
  workflowId: row.workflowId,
});

/**
 * Resolves the resource that called the current workflow.
 *
 * @param {Object} [row={}] - The called-workflow usage row.
 * @returns {{ id: string, resourceType: string } | null} The caller resource.
 */
const getCallerResource = (row = {}) => getResource({
  agentId: row.originalAgentId,
  workflowId: row.originalWorkflowId,
});

/**
 * Aggregates raw daily workflow usage rows by workflow and model, then enriches them with metric fields.
 *
 * @param {Object} options
 * @param {Object[]} [options.dailyWorkflowUsageRows=[]] - Normalized daily workflow usage rows.
 * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
 * @returns {Object[]} Workflow-model usage rows with token totals and estimated cost fields.
 */
const buildWorkflowsModelUsageRows = ({
  dailyWorkflowUsageRows = [],
  pricingTable = {},
} = {}) => UsageEntityDataHelper.buildEntityModelUsageRows({
  rows: dailyWorkflowUsageRows,
  pricingTable,
  entityKey: WORKFLOW_ENTITY_KEY,
});

/**
 * Builds donut rows for the direct-execution resource breakdown, keeping the current workflow first.
 *
 * @param {Object} options
 * @param {UsageBreakdownRow} [options.selfWorkflowRow] - The current-workflow row.
 * @param {UsageBreakdownRow[]} [options.calledResourceRows] - Delegated resource rows.
 * @param {string} options.sortKey - The metric key used to sort delegated resources.
 * @returns {UsageBreakdownRow[]} Donut rows with the current workflow first and delegated resources sorted by metric.
 */
const buildWorkflowDirectExecutionResourceDonutRows = ({
  selfWorkflowRow,
  calledResourceRows,
  sortKey,
} = {}) => {
  const donutRows = [
    selfWorkflowRow,
    ...(calledResourceRows ?? []),
  ].filter(row => row && (row.totalTokens > 0 || row.estimatedCost > 0));
  const selfWorkflowRows = donutRows.filter(row => row.rowType === UsageConstant.RowType.SELF_WORKFLOW.value);
  const resourceRows = donutRows
    .filter(row => row.rowType !== UsageConstant.RowType.SELF_WORKFLOW.value)
    .sort((left, right) => Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0));

  return [
    ...selfWorkflowRows,
    ...resourceRows,
  ];
};

/**
 * Builds KPI summary totals for a workflow usage overview tab.
 *
 * @param {Object} [workflowUsageData={}] - The normalized workflow usage data.
 * @returns {{ estimatedCost: number, executions: number, totalTokens: number }} The workflow overview totals.
 */
const buildWorkflowOverviewSummary = (workflowUsageData = {}) => ({
  estimatedCost: Number(workflowUsageData.workflowDirectExecutionEstimatedCost ?? 0)
    + Number(workflowUsageData.workflowCallerEstimatedCost ?? 0),
  executions: countDistinct(workflowUsageData.workflowSelfRows, 'executionId'),
  totalTokens: UsageDataHelper.sumUsageMetricTotals(workflowUsageData.workflowSelfRows).totalTokens,
});

class UsageWorkflowDataHelper {
  /**
   * Builds continuous daily execution rows for the workflows usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyExecutionsRows=[]] - Normalized daily execution rows.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {Object[]} The continuous daily execution rows for the selected date range.
   */
  static buildDailyExecutionChartRows({
    dailyExecutionsRows = [],
    startDate,
    endDate,
  }) {
    const safeRows = Array.isArray(dailyExecutionsRows) ? dailyExecutionsRows : [];
    const rowsByDate = new Map(
      safeRows.map(row => [
        row.date,
        Number(row.executionCount ?? 0),
      ]),
    );

    return UsageDataHelper.fillMissingDateRows({
      startDate,
      endDate,
      rowsByDate,
      createRow(date, executionCount) {
        return {
          date,
          executionCount: Number(executionCount ?? 0),
        };
      },
    });
  }

  /**
   * Builds model distribution rows for the workflows usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyWorkflowUsageRows=[]] - Normalized daily workflow usage rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object[]} Model-level rows sorted by token usage.
   */
  static buildWorkflowsModelBreakdownRows({
    dailyWorkflowUsageRows = [],
    pricingTable = {},
  } = {}) {
    return UsageDataHelper.buildModelBreakdownRows({
      rows: buildWorkflowsModelUsageRows({
        dailyWorkflowUsageRows,
        pricingTable,
      }),
    });
  }

  /**
   * Builds table rows for the workflows usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyWorkflowUsageRows=[]] - Normalized daily workflow usage rows.
   * @param {Object[]} [options.workflowsExecutionsAndUsersRows=[]] - Workflow-level execution and user count rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @param {(workflowId: string) => string} [options.getWorkflowDisplayName] - Resolves the label for a workflow id.
   * @returns {Object[]} Workflow table rows sorted by token usage.
   */
  static buildWorkflowsUsageTableItems({
    dailyWorkflowUsageRows = [],
    workflowsExecutionsAndUsersRows = [],
    pricingTable = {},
    getWorkflowDisplayName = workflowId => workflowId,
  } = {}) {
    return UsageEntityDataHelper.buildEntityUsageTableItems({
      rows: dailyWorkflowUsageRows,
      countRows: workflowsExecutionsAndUsersRows,
      pricingTable,
      entityKey: WORKFLOW_ENTITY_KEY,
      entityNameKey: WORKFLOW_ENTITY_NAME_KEY,
      invocationCountKey: WORKFLOW_INVOCATION_COUNT_KEY,
      userCountKey: WORKFLOW_USER_COUNT_KEY,
      avgCostKey: WORKFLOW_AVG_COST_KEY,
      getEntityDisplayName: getWorkflowDisplayName,
    });
  }

  /**
   * Builds KPI summary totals for the workflows usage overview page.
   *
   * @param {Object} options
   * @param {Object[]} [options.dailyWorkflowUsageRows=[]] - Normalized daily workflow usage rows.
   * @param {Object[]} [options.workflowsExecutionsAndUsersRows=[]] - Workflow-level execution and user count rows.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {{ workflowCount: number, estimatedCost: number, totalExecutions: number, totalTokens: number }} The workflows overview totals.
   */
  static buildWorkflowsUsageSummary({
    dailyWorkflowUsageRows = [],
    workflowsExecutionsAndUsersRows = [],
    pricingTable = {},
  } = {}) {
    return UsageEntityDataHelper.buildEntityUsageSummary({
      rows: dailyWorkflowUsageRows,
      countRows: workflowsExecutionsAndUsersRows,
      pricingTable,
      entityKey: WORKFLOW_ENTITY_KEY,
      entityCountKey: WORKFLOW_ENTITY_COUNT_KEY,
      totalCountKey: WORKFLOW_TOTAL_INVOCATION_COUNT_KEY,
      invocationCountKey: WORKFLOW_INVOCATION_COUNT_KEY,
    });
  }

  /**
   * Normalizes workflow usage rows into direct-execution, caller, and delegated buckets.
   *
   * @param {Object} options
   * @param {string} options.workflowId - The current workflow id.
   * @param {Object[]} [options.workflowOriginalUsageRows=[]] - Rows where the current workflow started the original run.
   * @param {Object[]} [options.workflowUsageRows=[]] - Rows where the current workflow consumed tokens.
   * @param {Object} [options.pricingTable={}] - The pricing table keyed by model name.
   * @returns {Object} Workflow usage rows and estimated cost totals by bucket.
   */
  static buildWorkflowUsageData({
    workflowId,
    workflowOriginalUsageRows = [],
    workflowUsageRows = [],
    pricingTable = {},
  } = {}) {
    const workflowSelfRows = UsageDataHelper.buildUsageMetricRows({
      pricingTable,
      rows: workflowUsageRows,
    });
    const workflowDelegatedResourceRows = UsageDataHelper.buildUsageMetricRows({
      pricingTable,
      rows: (Array.isArray(workflowOriginalUsageRows) ? workflowOriginalUsageRows : [])
        .filter(row => row.workflowId !== workflowId),
    });
    const workflowDirectExecutionRows = workflowSelfRows.filter(row => row.originalWorkflowId === workflowId);
    const workflowCallerRows = workflowSelfRows.filter(row => row.originalWorkflowId !== workflowId);

    return {
      workflowCallerRows,
      workflowDelegatedResourceRows,
      workflowDirectExecutionRows,
      workflowSelfRows,
      workflowCallerEstimatedCost: UsageDataHelper.sumEstimatedCost(workflowCallerRows),
      workflowDelegatedResourceEstimatedCost: UsageDataHelper.sumEstimatedCost(workflowDelegatedResourceRows),
      workflowDirectExecutionEstimatedCost: UsageDataHelper.sumEstimatedCost(workflowDirectExecutionRows),
    };
  }

  /**
   * Builds all derived data for a workflow usage overview tab.
   *
   * @param {Object} options
   * @param {Object} [options.workflowUsageData={}] - The normalized workflow usage data.
   * @param {Date | string | null} options.startDate - The inclusive start date of the range.
   * @param {Date | string | null} options.endDate - The inclusive end date of the range.
   * @returns {{ dailyUsageRows: Object[], modelBreakdownRows: Object[], summary: Object }} The overview tab data.
   */
  static buildWorkflowOverviewUsageData({
    workflowUsageData = {},
    startDate,
    endDate,
  } = {}) {
    const overviewUsageRows = workflowUsageData.workflowSelfRows ?? [];

    return {
      dailyUsageRows: UsageDataHelper.buildDailyUsageRows({
        rows: overviewUsageRows,
        startDate,
        endDate,
      }),
      modelBreakdownRows: UsageDataHelper.buildModelBreakdownRows({
        rows: overviewUsageRows,
      }),
      summary: buildWorkflowOverviewSummary(workflowUsageData),
    };
  }

  /**
   * Builds the direct-execution tab breakdown for current-workflow usage and delegated resources.
   *
   * @param {Object} [workflowUsageData={}] - The normalized workflow usage data.
   * @returns {Object} Direct-execution KPI, donut, and table rows containing UsageBreakdownRow collections.
   */
  static buildWorkflowDirectExecutionResourceBreakdown(workflowUsageData = {}) {
    const directExecutionRows = workflowUsageData.workflowDirectExecutionRows ?? [];
    const directExecutionMetricTotals = UsageDataHelper.sumUsageMetricTotals(directExecutionRows);
    const directExecutions = countDistinct(directExecutionRows, 'executionId');
    const selfWorkflowRow = {
      ...directExecutionMetricTotals,
      invocations: directExecutions,
      id: 'self-workflow',
      i18nLabel: '__fieldUsageSelfWorkflow',
      resourceId: directExecutionRows?.[0]?.workflowId ?? null,
      resourceType: ResourceConstant.Type.WORKFLOW.value,
      rowType: UsageConstant.RowType.SELF_WORKFLOW.value,
      usageRows: directExecutionRows,
    };
    const calledResourceRowsById = new Map();

    (workflowUsageData.workflowDelegatedResourceRows ?? []).forEach((row) => {
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
      estimatedCost: Number(workflowUsageData.workflowDelegatedResourceEstimatedCost ?? calledResourcesMetricTotals.estimatedCost),
      id: 'called-resources-subtotal',
      invocations: calledResourceRows.reduce((sum, row) => sum + Number(row.invocations ?? 0), 0),
      i18nLabel: '__fieldUsageDelegatedSubtotal',
      rowType: UsageConstant.RowType.SUBTOTAL.value,
    };
    const totalRowMetricTotals = UsageDataHelper.sumUsageMetricTotals([
      selfWorkflowRow,
      calledResourcesSubtotalRow,
    ]);
    const totalRow = {
      ...totalRowMetricTotals,
      estimatedCost: selfWorkflowRow.estimatedCost + calledResourcesSubtotalRow.estimatedCost,
      id: 'direct-executions-total',
      invocations: selfWorkflowRow.invocations + calledResourcesSubtotalRow.invocations,
      i18nLabel: '__fieldTotal',
      rowType: UsageConstant.RowType.TOTAL.value,
      totalTokens: selfWorkflowRow.totalTokens + calledResourcesSubtotalRow.totalTokens,
    };
    const averageFullFlowEstimatedCost = directExecutions > 0 ? totalRow.estimatedCost / directExecutions : 0;
    const tokenDonutRows = buildWorkflowDirectExecutionResourceDonutRows({
      selfWorkflowRow,
      calledResourceRows,
      sortKey: UsageConstant.MetricField.TOTAL_TOKENS.value,
    });
    const estimatedCostDonutRows = buildWorkflowDirectExecutionResourceDonutRows({
      selfWorkflowRow,
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
      directExecutions,
      selfWorkflowRow,
      tableRows: [
        selfWorkflowRow,
        calledResourcesSubtotalRow,
        ...calledResourceRows,
        totalRow,
      ],
      tokenDonutRows,
      totalRow,
    };
  }

  /**
   * Builds the caller tab breakdown for resources that invoked the current workflow.
   *
   * @param {Object} [workflowUsageData={}] - The normalized workflow usage data.
   * @returns {Object} Caller KPI and table rows containing UsageBreakdownRow collections.
   */
  static buildWorkflowCallerBreakdown(workflowUsageData = {}) {
    const callerRowsById = new Map();

    (workflowUsageData.workflowCallerRows ?? []).forEach((row) => {
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
        executionIds: new Set(),
      };

      if (row.executionId) {
        item.executionIds.add(row.executionId);
      }

      item.usageRows.push(row);
      callerRowsById.set(key, item);
    });

    const callerRows = [...callerRowsById.values()]
      .map((item) => {
        const metricTotals = UsageDataHelper.sumUsageMetricTotals(item.usageRows);

        return {
          ...metricTotals,
          id: item.id,
          invocations: item.executionIds.size,
          resourceId: item.resourceId,
          resourceType: item.resourceType,
          rowType: UsageConstant.RowType.CALLER_RESOURCE.value,
          usageRows: item.usageRows,
        };
      })
      .sort((left, right) => right.estimatedCost - left.estimatedCost);
    const metricTotals = UsageDataHelper.sumUsageMetricTotals(callerRows);
    const totalTokens = metricTotals.totalTokens;
    const calls = callerRows.reduce((sum, row) => sum + Number(row.invocations ?? 0), 0);
    const estimatedCost = Number(workflowUsageData.workflowCallerEstimatedCost ?? 0);
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

export default UsageWorkflowDataHelper;
