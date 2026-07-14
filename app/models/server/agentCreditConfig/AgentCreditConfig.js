class AgentCreditConfig {
  constructor({
    agentId,
    tierThreshold,
    quota,
    updatedTs,
  } = {}) {
    this.agentId = agentId ?? '';
    this.tierThreshold = tierThreshold ?? null; // Baseline allowance, actual usage may exceed it and must not be null
    this.quota = quota ?? null; // Hard ceiling, null means no cap
    this.updatedTs = updatedTs ?? null;
  }

  /**
   * @param {AgentCreditConfig} config
   */
  static toRequestPayload(config) {
    return {
      agent_id: config.agentId,
      tier_threshold: config.tierThreshold,
      quota: config.quota,
    };
  }
}

export default AgentCreditConfig;
