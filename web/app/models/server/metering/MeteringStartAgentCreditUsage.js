class MeteringStartAgentCreditUsage {
  constructor({
    agentId,
  } = {}) {
    this.agentId = agentId;
  }

  static toRequestPayload(request) {
    return {
      agent_id: request.agentId,
    };
  }
}

export default MeteringStartAgentCreditUsage;
