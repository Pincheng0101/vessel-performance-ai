class MeteringStartQueryTokenUsage {
  constructor({
    agentId,
    endDate,
    executionId,
    fields,
    groupBy,
    llmType,
    model,
    orderBy,
    originalAgentId,
    originalWorkflowId,
    sessionId,
    startDate,
    user,
    workflowId,
  } = {}) {
    this.agentId = agentId;
    this.endDate = endDate;
    this.executionId = executionId;
    this.fields = fields;
    this.groupBy = groupBy;
    this.llmType = llmType;
    this.model = model;
    this.orderBy = orderBy;
    this.originalAgentId = originalAgentId;
    this.originalWorkflowId = originalWorkflowId;
    this.sessionId = sessionId;
    this.startDate = startDate;
    this.user = user;
    this.workflowId = workflowId;
  }

  /**
   * @param {MeteringStartQueryTokenUsage} request
   */
  static toRequestPayload(request) {
    return {
      agent_id: request.agentId,
      end_date: request.endDate,
      execution_id: request.executionId,
      fields: request.fields,
      group_by: request.groupBy,
      llm_type: request.llmType,
      model: request.model,
      order_by: request.orderBy,
      orig_agent_id: request.originalAgentId,
      orig_workflow_id: request.originalWorkflowId,
      session_id: request.sessionId,
      start_date: request.startDate,
      user: request.user,
      workflow_id: request.workflowId,
    };
  }
}

export default MeteringStartQueryTokenUsage;
