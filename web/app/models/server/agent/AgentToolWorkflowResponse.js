import AgentToolWorkflow from './AgentToolWorkflow';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolWorkflowResponse extends AgentToolWorkflow {
  constructor({
    description,
    display_name,
    name,
    tags,
    tool_type,
    track_tool_results,
    workflow_id,
  } = {}) {
    super({
      description,
      displayName: display_name,
      name,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
      workflowId: workflow_id,
    });
  }
}

export default AgentToolWorkflowResponse;
