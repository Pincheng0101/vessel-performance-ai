import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolWorkflow extends AgentTool {
  constructor({
    description,
    displayName,
    name,
    tags,
    toolType = AgentConstant.ToolType.WORKFLOW.value,
    trackToolResults,
    workflowId,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.workflowId = workflowId;
  }

  /**
   * @param {AgentToolWorkflow} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      workflow_id: tool.workflowId,
    };
  }
}

export default AgentToolWorkflow;
