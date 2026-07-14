/**
 * Canonical usage token and estimated-cost totals.
 *
 * @typedef {Object} UsageMetricTotals
 * @property {number} estimatedCacheReadInputCost
 * @property {number} estimatedCacheWriteInputCost
 * @property {number} estimatedCost
 * @property {number} estimatedInputCost
 * @property {number} estimatedOutputCost
 * @property {number} totalCacheReadInputTokens
 * @property {number} totalCacheWriteInputTokens
 * @property {number} totalInputTokens
 * @property {number} totalOutputTokens
 * @property {number} totalTokens
 */

/**
 * A normalized usage row enriched with canonical token and cost totals.
 *
 * @typedef {UsageMetricTotals & Object} UsageMetricRow
 * @property {string | null} [agentId]
 * @property {string | null} [date]
 * @property {string | null} [executionId]
 * @property {string | null} [model]
 * @property {string | null} [originalAgentId]
 * @property {string | null} [originalWorkflowId]
 * @property {string | null} [sessionId]
 * @property {string | null} [source]
 * @property {number} [sumCacheReadInputTokens]
 * @property {number} [sumCacheWriteInputTokens]
 * @property {number} [sumInputTokens]
 * @property {number} [sumOutputTokens]
 * @property {string | null} [user]
 * @property {string | null} [workflowId]
 */

/**
 * Resource breakdown row with canonical usage totals and resource metadata.
 *
 * @typedef {UsageMetricTotals & Object} UsageBreakdownRow
 * @property {string} id
 * @property {string} [i18nLabel]
 * @property {number} invocations
 * @property {string | null} [resourceId]
 * @property {string} [resourceType]
 * @property {string} rowType
 * @property {UsageMetricRow[]} [usageRows]
 */
