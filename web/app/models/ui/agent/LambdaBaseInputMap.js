// Canonical JSON stringify with recursively sorted object keys, so the
// fingerprint is independent of key-ordering differences between the
// stored snapshot and the current agent payload.
const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${entries.join(',')}}`;
};

class LambdaBaseInputMap {
  static getUiDataKeyForSession(agentId, sessionId, userId) {
    return `lambda-base-input-${agentId}-session-${sessionId}-user-${userId}`;
  }

  static getUiDataKeyForAgentDefault(agentId, userId) {
    return `lambda-base-input-${agentId}-user-${userId}`;
  }

  static getUiDataKeyForSchemaFingerprint(agentId, userId) {
    return `lambda-base-input-fingerprint-${agentId}-user-${userId}`;
  }

  /**
   * Canonical string snapshot of every Lambda tool's base_input_schema, keyed
   * by tool name (or the literal "lambda" for unnamed blocks). Used to detect
   * schema drift across sessions — when the stored fingerprint differs from
   * the current agent's schema, the auto-open dialog fires.
   */
  static getSchemaFingerprint(lambdaTools) {
    const result = {};
    for (const tool of (lambdaTools ?? [])) {
      if (!tool.baseInputSchema) continue;
      const key = tool.name || 'lambda';
      result[key] = tool.baseInputSchema;
    }
    return stableStringify(result);
  }
}

export default LambdaBaseInputMap;
