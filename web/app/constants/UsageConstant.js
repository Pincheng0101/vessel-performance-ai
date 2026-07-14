import * as ChartConstant from './ChartConstant';
import * as IconConstant from './IconConstant';

const MeteringQueryState = Object.freeze({
  FAILED: {
    i18nTitle: '__fieldStatusFailed',
    value: 'FAILED',
  },
  QUEUED: {
    i18nTitle: '__fieldStatusPending',
    value: 'QUEUED',
  },
  RUNNING: {
    i18nTitle: '__fieldStatusRunning',
    value: 'RUNNING',
  },
  SUCCEEDED: {
    i18nTitle: '__fieldStatusSucceeded',
    value: 'SUCCEEDED',
  },
});

const MeteringType = Object.freeze({
  SEARCH_ENGINE: {
    value: 'searchEngine',
  },
  TOKEN: {
    value: 'token',
  },
});

const AthenaOutputType = Object.freeze({
  ROWS: {
    value: 'rows',
  },
  FILE: {
    value: 'file',
  },
});

const NormalizerKey = Object.freeze({
  AGENTS_SESSIONS_AND_USERS: {
    value: 'agents-sessions-and-users',
  },
  DAILY_AGENT_TOKEN_USAGE: {
    value: 'daily-agent-token-usage',
  },
  DAILY_EXECUTIONS: {
    value: 'daily-executions',
  },
  DAILY_SESSIONS: {
    value: 'daily-sessions',
  },
  DAILY_TOKEN_USAGE: {
    value: 'daily-token-usage',
  },
  DAILY_USERS: {
    value: 'daily-users',
  },
  DAILY_WORKFLOW_TOKEN_USAGE: {
    value: 'daily-workflow-token-usage',
  },
  RESOURCE_TOKEN_USAGE: {
    value: 'resource-token-usage',
  },
  SEARCH_ENGINE_USAGE: {
    value: 'search-engine-usage',
  },
  TOKEN_KPI: {
    value: 'token-kpi',
  },
  USERS_TOKEN_USAGE: {
    value: 'users-token-usage',
  },
  USER_TOKEN_USAGE: {
    value: 'user-token-usage',
  },
  WORKFLOWS_EXECUTIONS_AND_USERS: {
    value: 'workflows-executions-and-users',
  },
});

const ChartVariant = Object.freeze({
  TOKEN_COUNT: {
    value: 'tokenCount',
    icon: 'mdi-circle-multiple-outline',
    i18nTitle: '__fieldUsageTokens',
  },
  ESTIMATED_COST: {
    value: 'estimatedCost',
    icon: 'mdi-cash',
    i18nTitle: '__fieldUsageCost',
  },
});

const MetricField = Object.freeze({
  TOTAL_TOKENS: {
    value: 'totalTokens',
  },
  ESTIMATED_COST: {
    value: 'estimatedCost',
  },
});

const TokenType = Object.freeze({
  SESSION: {
    value: 'session',
  },
  RUN: {
    value: 'run',
  },
  OTHERS: {
    value: 'others',
  },
});

const SourceType = Object.freeze({
  AGENTCORE: {
    value: 'agentcore',
  },
  CHAT_SESSION_NAME: {
    value: 'chat_session_name',
  },
  COPILOT_CODE_ACTION: {
    i18nTitle: '__fieldUsageSourceCopilotCodeAction',
    value: 'copilot_code_action',
  },
  ITEM_GENERATION: {
    i18nTitle: '__fieldUsageSourceItemGeneration',
    value: 'item_generation',
  },
  PROMPT_REWRITER: {
    i18nTitle: '__fieldUsageSourcePromptRewriting',
    value: 'prompt_rewriter',
  },
  WORKFLOW_ACTION: {
    i18nTitle: '__fieldUsageSourceWorkflowActionUnattributed',
    value: 'workflow_action',
  },
});

const RowType = Object.freeze({
  AVERAGE: {
    value: 'average',
  },
  CALLED_RESOURCE: {
    value: 'calledResource',
  },
  CALLER_RESOURCE: {
    value: 'callerResource',
  },
  SELF_AGENT: {
    value: 'selfAgent',
  },
  SELF_WORKFLOW: {
    value: 'selfWorkflow',
  },
  SUBTOTAL: {
    value: 'subtotal',
  },
  TOTAL: {
    value: 'total',
  },
});

const DatasetType = Object.freeze({
  INPUT: {
    i18nTitle: '__fieldUsageInput',
    value: 'input',
    chartColor: {
      palette: ChartConstant.ColorPaletteKey.SECONDARY,
      index: 0,
    },
  },
  OUTPUT: {
    i18nTitle: '__fieldUsageOutput',
    value: 'output',
    chartColor: {
      palette: ChartConstant.ColorPaletteKey.PRIMARY,
    },
  },
  CACHE_READ_INPUT: {
    i18nTitle: '__fieldUsageCacheReadInput',
    value: 'cacheReadInput',
    chartColor: {
      palette: ChartConstant.ColorPaletteKey.SECONDARY,
      index: 2,
    },
  },
  CACHE_WRITE_INPUT: {
    i18nTitle: '__fieldUsageCacheWriteInput',
    value: 'cacheWriteInput',
    chartColor: {
      palette: ChartConstant.ColorPaletteKey.SECONDARY,
      index: 4,
    },
  },
});

const ValueFormat = Object.freeze({
  CURRENCY: {
    value: 'currency',
  },
  NUMBER: {
    value: 'number',
  },
});

const KpiCardDetailsType = Object.freeze({
  BREAKDOWN: {
    value: 'breakdown',
  },
});

const UserDisplayNameReplacementPrefixes = Object.freeze([
  'Microsoft',
]);

const Kpi = Object.freeze({
  TOTAL_TOKENS: {
    icon: 'mdi-circle-multiple-outline',
    i18nTitle: '__titleUsageTotalTokens',
  },
  INPUT_TOKENS: {
    icon: 'mdi-arrow-bottom-left-thin-circle-outline',
    i18nTitle: '__titleUsageInputTokens',
  },
  OUTPUT_TOKENS: {
    icon: 'mdi-arrow-top-right-thin-circle-outline',
    i18nTitle: '__titleUsageOutputTokens',
  },
  ESTIMATED_COST: {
    icon: 'mdi-cash',
    i18nTitle: '__titleUsageEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
  },
  USERS: {
    icon: 'mdi-account',
    i18nTitle: '__titleUsageUsers',
    i18nLinkTitle: '__actionViewUserAnalysis',
    to: '/usage/users',
  },
  AGENTS: {
    icon: IconConstant.Base.AGENT,
    i18nTitle: '__titleUsageActiveAgents',
    i18nLinkTitle: '__actionViewAgentAnalysis',
    to: '/usage/agents',
  },
  SESSIONS: {
    icon: 'mdi-message-badge-outline',
    i18nTitle: '__titleUsageTotalAgentSessions',
  },
  WORKFLOWS: {
    icon: IconConstant.Base.WORKFLOW,
    i18nTitle: '__titleUsageActiveWorkflows',
    i18nLinkTitle: '__actionViewWorkflowAnalysis',
    to: '/usage/workflows',
  },
  EXECUTIONS: {
    icon: 'mdi-play-circle-outline',
    i18nTitle: '__titleUsageTotalWorkflowExecutions',
  },
});

const SfnExecutionState = Object.freeze({
  ABORTED: {
    value: 'ABORTED',
  },
  FAILED: {
    value: 'FAILED',
  },
  RUNNING: {
    value: 'RUNNING',
  },
  SUCCEEDED: {
    value: 'SUCCEEDED',
  },
  TIMED_OUT: {
    value: 'TIMED_OUT',
  },
});

const Preset = Object.freeze({
  TOKEN_KPI: {
    id: 'token-kpi',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.TOKEN_KPI.value,
    requestBody: {
      fields: [
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
        'count_distinct(user)',
        'count_distinct(agent_id)',
        'count_distinct(session_id)',
        'count_distinct(workflow_id)',
        'count_distinct(execution_id)',
      ],
    },
  },
  DAILY_TOKEN_USAGE: {
    id: 'daily-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_TOKEN_USAGE.value,
    requestBody: {
      fields: [
        'date',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
      ],
      groupBy: ['date', 'model'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
        { field: 'model', direction: 'ASC' },
      ],
    },
  },
  DAILY_USERS: {
    id: 'daily-users',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_USERS.value,
    requestBody: {
      fields: [
        'date',
        'count_distinct(user)',
      ],
      groupBy: ['date'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
      ],
    },
  },
  USERS_TOKEN_USAGE: {
    id: 'users-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.USERS_TOKEN_USAGE.value,
    requestBody: {
      fields: [
        'user',
        'model',
        'agent_id',
        'workflow_id',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
      ],
      groupBy: ['user', 'model', 'agent_id', 'workflow_id'],
      orderBy: [
        { field: 'sum_input_tokens', direction: 'DESC' },
      ],
    },
  },
  USER_TOKEN_USAGE: {
    id: 'user-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.USER_TOKEN_USAGE.value,
    requestBody: {
      user: '',
      fields: [
        'date',
        'user',
        'model',
        'agent_id',
        'session_id',
        'workflow_id',
        'execution_id',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
        'source',
      ],
      groupBy: ['date', 'model', 'agent_id', 'workflow_id', 'session_id', 'execution_id', 'source'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
        { field: 'model', direction: 'ASC' },
      ],
    },
  },
  DAILY_AGENT_TOKEN_USAGE: {
    id: 'daily-agent-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_AGENT_TOKEN_USAGE.value,
    requestBody: {
      fields: [
        'date',
        'agent_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_read_input_tokens)',
        'sum(cache_write_input_tokens)',
      ],
      groupBy: ['date', 'agent_id', 'model'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
        { field: 'model', direction: 'ASC' },
      ],
    },
  },
  DAILY_WORKFLOW_TOKEN_USAGE: {
    id: 'daily-workflow-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_WORKFLOW_TOKEN_USAGE.value,
    requestBody: {
      fields: [
        'date',
        'workflow_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_read_input_tokens)',
        'sum(cache_write_input_tokens)',
      ],
      groupBy: ['date', 'workflow_id', 'model'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
        { field: 'model', direction: 'ASC' },
      ],
    },
  },
  DAILY_EXECUTIONS: {
    id: 'daily-executions',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_EXECUTIONS.value,
    requestBody: {
      fields: [
        'date',
        'count_distinct(execution_id)',
      ],
      groupBy: ['date'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
      ],
    },
  },
  DAILY_SESSIONS: {
    id: 'daily-sessions',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.DAILY_SESSIONS.value,
    requestBody: {
      fields: [
        'date',
        'count_distinct(session_id)',
      ],
      groupBy: ['date'],
      orderBy: [
        { field: 'date', direction: 'ASC' },
      ],
    },
  },
  AGENTS_SESSIONS_AND_USERS: {
    id: 'agents-sessions-and-users',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.AGENTS_SESSIONS_AND_USERS.value,
    requestBody: {
      fields: [
        'agent_id',
        'count_distinct(session_id)',
        'count_distinct(user)',
      ],
      groupBy: ['agent_id'],
      orderBy: [
        { field: 'agent_id', direction: 'ASC' },
      ],
    },
  },
  WORKFLOWS_EXECUTIONS_AND_USERS: {
    id: 'workflows-executions-and-users',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.WORKFLOWS_EXECUTIONS_AND_USERS.value,
    requestBody: {
      fields: [
        'workflow_id',
        'count_distinct(execution_id)',
        'count_distinct(user)',
      ],
      groupBy: ['workflow_id'],
      orderBy: [
        { field: 'workflow_id', direction: 'ASC' },
      ],
    },
  },
  AGENT_ORIGINAL_TOKEN_USAGE: {
    id: 'agent-original-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.RESOURCE_TOKEN_USAGE.value,
    requestBody: {
      originalAgentId: '',
      fields: [
        'date',
        'orig_agent_id',
        'orig_workflow_id',
        'agent_id',
        'workflow_id',
        'session_id',
        'execution_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
        'source',
      ],
    },
  },
  AGENT_TOKEN_USAGE: {
    id: 'agent-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.RESOURCE_TOKEN_USAGE.value,
    requestBody: {
      agentId: '',
      fields: [
        'date',
        'orig_agent_id',
        'orig_workflow_id',
        'agent_id',
        'workflow_id',
        'session_id',
        'execution_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
        'source',
      ],
    },
  },
  WORKFLOW_ORIGINAL_TOKEN_USAGE: {
    id: 'workflow-original-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.RESOURCE_TOKEN_USAGE.value,
    requestBody: {
      originalWorkflowId: '',
      fields: [
        'date',
        'orig_agent_id',
        'orig_workflow_id',
        'agent_id',
        'workflow_id',
        'session_id',
        'execution_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
      ],
    },
  },
  WORKFLOW_TOKEN_USAGE: {
    id: 'workflow-token-usage',
    meteringType: MeteringType.TOKEN.value,
    maxResults: null,
    normalizerKey: NormalizerKey.RESOURCE_TOKEN_USAGE.value,
    requestBody: {
      workflowId: '',
      fields: [
        'date',
        'orig_agent_id',
        'orig_workflow_id',
        'agent_id',
        'workflow_id',
        'session_id',
        'execution_id',
        'model',
        'sum(input_tokens)',
        'sum(output_tokens)',
        'sum(cache_write_input_tokens)',
        'sum(cache_read_input_tokens)',
      ],
    },
  },
  SEARCH_ENGINE_USAGE: {
    id: 'search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      fields: [
        'count(*)',
      ],
      groupBy: [
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  AGENTS_SEARCH_ENGINE_USAGE: {
    id: 'agents-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      fields: [
        'count(*)',
      ],
      groupBy: [
        'agent_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  WORKFLOWS_SEARCH_ENGINE_USAGE: {
    id: 'workflows-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      fields: [
        'count(*)',
      ],
      groupBy: [
        'workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  USER_SEARCH_ENGINE_USAGE: {
    id: 'user-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      user: '',
      fields: [
        'count(*)',
      ],
      groupBy: [
        'agent_id',
        'workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  AGENT_ORIGINAL_SEARCH_ENGINE_USAGE: {
    id: 'agent-original-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      originalAgentId: '',
      fields: [
        'count(*)',
      ],
      groupBy: [
        'agent_id',
        'workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  AGENT_SEARCH_ENGINE_USAGE: {
    id: 'agent-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      agentId: '',
      fields: [
        'count(*)',
      ],
      groupBy: [
        'orig_agent_id',
        'orig_workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  WORKFLOW_ORIGINAL_SEARCH_ENGINE_USAGE: {
    id: 'workflow-original-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      originalWorkflowId: '',
      fields: [
        'count(*)',
      ],
      groupBy: [
        'agent_id',
        'workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
  WORKFLOW_SEARCH_ENGINE_USAGE: {
    id: 'workflow-search-engine-usage',
    meteringType: MeteringType.SEARCH_ENGINE.value,
    maxResults: null,
    normalizerKey: NormalizerKey.SEARCH_ENGINE_USAGE.value,
    requestBody: {
      workflowId: '',
      fields: [
        'count(*)',
      ],
      groupBy: [
        'orig_agent_id',
        'orig_workflow_id',
        'search_engine_type',
        'search_engine_id',
      ],
    },
  },
});

export {
  AthenaOutputType,
  ChartVariant,
  DatasetType,
  Kpi,
  KpiCardDetailsType,
  MeteringQueryState,
  MeteringType,
  MetricField,
  NormalizerKey,
  Preset,
  RowType,
  SfnExecutionState,
  SourceType,
  TokenType,
  UserDisplayNameReplacementPrefixes,
  ValueFormat,
};
