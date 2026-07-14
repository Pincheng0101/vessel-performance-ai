class StartHqCopilotAgent {
  constructor({
    sessionId,
    llmId,
    url,
    agentId,
    user,
  } = {}) {
    this.sessionId = sessionId;
    this.llmId = llmId;
    this.url = url;
    this.agentId = agentId;
    this.user = user;
  }

  /**
   * @param {StartHqCopilotAgent} runtime
   */
  static toRequestPayload(runtime) {
    return {
      session_id: runtime.sessionId,
      llm_id: runtime.llmId,
    };
  }
}

export default StartHqCopilotAgent;
