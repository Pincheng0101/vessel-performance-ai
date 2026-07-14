class AgentUserPreferences {
  constructor({
    llmId,
    storageId,
  } = {}) {
    this.llmId = llmId ?? null;
    this.storageId = storageId ?? null;
  }

  static getUiDataKey(agentId, userId) {
    return `preference-${agentId}-user-${userId}`;
  }
}

export default AgentUserPreferences;
