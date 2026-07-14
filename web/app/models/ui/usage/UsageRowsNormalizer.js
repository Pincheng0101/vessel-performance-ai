import { UsageConstant } from '~/constants';

class UsageRowModel {
  constructor(row = {}) {
    this.rawRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  }

  static normalizeRows(rows = []) {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map(row => new this(row))
      .map(row => row.normalize());
  }

  getValue(key) {
    if (!this.hasKey(key)) {
      return undefined;
    }

    return this.rawRow[key];
  }

  getNumber(key) {
    if (!this.hasKey(key)) {
      return undefined;
    }

    const value = this.getValue(key);

    return value === null ? null : Number(value);
  }

  hasKey(key) {
    return Object.prototype.hasOwnProperty.call(this.rawRow, key);
  }

  getFields(fieldMap) {
    return Object.entries(fieldMap).reduce((fields, [normalizedKey, rawKey]) => {
      if (this.hasKey(rawKey)) {
        fields[normalizedKey] = this.getValue(rawKey);
      }

      return fields;
    }, {});
  }

  getNumberFields(fieldMap) {
    return Object.entries(fieldMap).reduce((fields, [normalizedKey, rawKey]) => {
      if (this.hasKey(rawKey)) {
        fields[normalizedKey] = this.getNumber(rawKey);
      }

      return fields;
    }, {});
  }
}

class UsageTokenRowModel extends UsageRowModel {
  getTokenFields() {
    return this.getNumberFields({
      sumInputTokens: 'sum_input_tokens',
      sumOutputTokens: 'sum_output_tokens',
      sumCacheReadInputTokens: 'sum_cache_read_input_tokens',
      sumCacheWriteInputTokens: 'sum_cache_write_input_tokens',
    });
  }
}

class UsageDailyTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        date: 'date',
        model: 'model',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageUsersTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
        model: 'model',
        user: 'user',
        workflowId: 'workflow_id',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageUserTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
        date: 'date',
        executionId: 'execution_id',
        model: 'model',
        sessionId: 'session_id',
        source: 'source',
        user: 'user',
        workflowId: 'workflow_id',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageResourceTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
        date: 'date',
        executionId: 'execution_id',
        model: 'model',
        originalAgentId: 'orig_agent_id',
        originalWorkflowId: 'orig_workflow_id',
        sessionId: 'session_id',
        source: 'source',
        workflowId: 'workflow_id',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageDailyAgentTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
        date: 'date',
        model: 'model',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageDailyWorkflowTokenUsageRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getFields({
        date: 'date',
        workflowId: 'workflow_id',
        model: 'model',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageTokenKpiRow extends UsageTokenRowModel {
  normalize() {
    return {
      ...this.getNumberFields({
        agentCount: 'count_distinct_agent_id',
        executionCount: 'count_distinct_execution_id',
        sessionCount: 'count_distinct_session_id',
        userCount: 'count_distinct_user',
        workflowCount: 'count_distinct_workflow_id',
      }),
      ...this.getTokenFields(),
    };
  }
}

class UsageDailyUsersRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        date: 'date',
      }),
      ...this.getNumberFields({
        userCount: 'count_distinct_user',
      }),
    };
  }
}

class UsageDailySessionsRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        date: 'date',
      }),
      ...this.getNumberFields({
        sessionCount: 'count_distinct_session_id',
      }),
    };
  }
}

class UsageDailyExecutionsRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        date: 'date',
      }),
      ...this.getNumberFields({
        executionCount: 'count_distinct_execution_id',
      }),
    };
  }
}

class UsageAgentsSessionsAndUsersRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
      }),
      ...this.getNumberFields({
        sessions: 'count_distinct_session_id',
        users: 'count_distinct_user',
      }),
    };
  }
}

class UsageWorkflowsExecutionsAndUsersRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        workflowId: 'workflow_id',
      }),
      ...this.getNumberFields({
        executions: 'count_distinct_execution_id',
        users: 'count_distinct_user',
      }),
    };
  }
}

class UsageSearchEngineUsageRow extends UsageRowModel {
  normalize() {
    return {
      ...this.getFields({
        agentId: 'agent_id',
        date: 'date',
        executionId: 'execution_id',
        originalAgentId: 'orig_agent_id',
        originalWorkflowId: 'orig_workflow_id',
        searchEngineId: 'search_engine_id',
        searchEngineType: 'search_engine_type',
        sessionId: 'session_id',
        source: 'source',
        user: 'user',
        workflowId: 'workflow_id',
      }),
      ...this.getNumberFields({
        queryCount: 'count_all',
      }),
    };
  }
}

const ROW_MODEL_BY_NORMALIZER_KEY = Object.freeze({
  [UsageConstant.NormalizerKey.TOKEN_KPI.value]: UsageTokenKpiRow,
  [UsageConstant.NormalizerKey.DAILY_TOKEN_USAGE.value]: UsageDailyTokenUsageRow,
  [UsageConstant.NormalizerKey.DAILY_USERS.value]: UsageDailyUsersRow,
  [UsageConstant.NormalizerKey.USERS_TOKEN_USAGE.value]: UsageUsersTokenUsageRow,
  [UsageConstant.NormalizerKey.USER_TOKEN_USAGE.value]: UsageUserTokenUsageRow,
  [UsageConstant.NormalizerKey.DAILY_AGENT_TOKEN_USAGE.value]: UsageDailyAgentTokenUsageRow,
  [UsageConstant.NormalizerKey.DAILY_WORKFLOW_TOKEN_USAGE.value]: UsageDailyWorkflowTokenUsageRow,
  [UsageConstant.NormalizerKey.DAILY_EXECUTIONS.value]: UsageDailyExecutionsRow,
  [UsageConstant.NormalizerKey.DAILY_SESSIONS.value]: UsageDailySessionsRow,
  [UsageConstant.NormalizerKey.AGENTS_SESSIONS_AND_USERS.value]: UsageAgentsSessionsAndUsersRow,
  [UsageConstant.NormalizerKey.WORKFLOWS_EXECUTIONS_AND_USERS.value]: UsageWorkflowsExecutionsAndUsersRow,
  [UsageConstant.NormalizerKey.RESOURCE_TOKEN_USAGE.value]: UsageResourceTokenUsageRow,
  [UsageConstant.NormalizerKey.SEARCH_ENGINE_USAGE.value]: UsageSearchEngineUsageRow,
});

class UsageRowsNormalizer {
  static normalizeRowsByPreset({
    preset,
    rows = [],
  } = {}) {
    const normalizerKey = preset?.normalizerKey;
    const RowModel = ROW_MODEL_BY_NORMALIZER_KEY[normalizerKey];

    if (!RowModel) return [];

    return RowModel.normalizeRows(rows);
  }
}

export default UsageRowsNormalizer;
