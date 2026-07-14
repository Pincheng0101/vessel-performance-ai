class MeteringStartQuerySearchEngineUsage {
  constructor({
    agentId,
    endDate,
    executionId,
    fields,
    groupBy,
    orderBy,
    originalAgentId,
    originalWorkflowId,
    searchEngineId,
    searchEngineType,
    sessionId,
    source,
    startDate,
    user,
    workflowId,
  } = {}) {
    this.agentId = agentId;
    this.endDate = endDate;
    this.executionId = executionId;
    this.fields = fields;
    this.groupBy = groupBy;
    this.orderBy = orderBy;
    this.originalAgentId = originalAgentId;
    this.originalWorkflowId = originalWorkflowId;
    this.searchEngineId = searchEngineId;
    this.searchEngineType = searchEngineType;
    this.sessionId = sessionId;
    this.source = source;
    this.startDate = startDate;
    this.user = user;
    this.workflowId = workflowId;
  }

  /**
   * @param {MeteringStartQuerySearchEngineUsage} request
   */
  static toRequestPayload(request) {
    return {
      agent_id: request.agentId,
      end_date: request.endDate,
      execution_id: request.executionId,
      fields: request.fields,
      group_by: request.groupBy,
      order_by: request.orderBy,
      orig_agent_id: request.originalAgentId,
      orig_workflow_id: request.originalWorkflowId,
      search_engine_id: request.searchEngineId,
      search_engine_type: request.searchEngineType,
      session_id: request.sessionId,
      source: request.source,
      start_date: request.startDate,
      user: request.user,
      workflow_id: request.workflowId,
    };
  }
}

export default MeteringStartQuerySearchEngineUsage;
