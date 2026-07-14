import { AgentConstant } from '~/constants';

class StartAgent {
  constructor({
    agentId,
    sessionId,
    storageId,
    toolRuntimeConfig,
    url,
    user,
  } = {}) {
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.storageId = storageId;
    this.toolRuntimeConfig = toolRuntimeConfig ?? {};
    this.url = url;
    this.user = user;
  }

  /**
   * @param {StartAgent} runtime
   */
  static toRequestPayload(runtime) {
    return {
      agent_id: runtime.agentId,
      session_id: runtime.sessionId,
      storage_id: runtime.storageId,
      ...(Object.keys(runtime.toolRuntimeConfig ?? {}).length
        ? { tool_runtime_config: runtime.toolRuntimeConfig }
        : {}),
    };
  }

  /**
   * Transforms an internal { [toolName]: lambdaBaseInputObject } map into the
   * backend's discriminated-union shape. Each base_input is recursively pruned
   * of empty values (so the schema renderer's auto-template defaults don't get
   * sent as overrides); entries that prune to empty are dropped entirely.
   *
   * @param {Object|null} lambdaBaseInputMap
   */
  static buildToolRuntimeConfigPayload(lambdaBaseInputMap) {
    if (!lambdaBaseInputMap) return null;
    const entries = Object.entries(lambdaBaseInputMap)
      .map(([toolName, baseInput]) => [toolName, StartAgent.pruneEmptyValues(baseInput)])
      .filter(([, baseInput]) => baseInput && Object.keys(baseInput).length > 0)
      .map(([toolName, baseInput]) => [
        toolName,
        {
          tool_type: AgentConstant.ToolType.LAMBDA.value,
          base_input: baseInput,
        },
      ]);
    if (entries.length === 0) return null;
    return Object.fromEntries(entries);
  }

  /**
   * Recursively removes keys whose values are empty (null, undefined, '', [], or
   * objects that prune to {}). Preserves 0, false, and other explicit primitives.
   * Explicit `null` is treated as empty and dropped — pydantic resolves missing
   * keys to the field default, which matches the intent of "do not override".
   */
  static pruneEmptyValues(value) {
    if (value === null || value === undefined || value === '') return undefined;
    if (Array.isArray(value)) {
      return value.length > 0 ? value : undefined;
    }
    if (typeof value === 'object') {
      const pruned = Object.entries(value).reduce((acc, [k, v]) => {
        const next = StartAgent.pruneEmptyValues(v);
        if (next !== undefined) acc[k] = next;
        return acc;
      }, {});
      return Object.keys(pruned).length > 0 ? pruned : undefined;
    }
    return value;
  }
}

export default StartAgent;
