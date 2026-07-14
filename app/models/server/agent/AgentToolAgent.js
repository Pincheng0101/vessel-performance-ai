import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolAgent extends AgentTool {
  constructor({
    agentId,
    description,
    displayName,
    name,
    tags,
    toolType = AgentConstant.ToolType.AGENT.value,
    trackToolResults,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.agentId = agentId;
  }

  /**
   * @param {AgentToolAgent} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      agent_id: tool.agentId,
    };
  }
}

export default AgentToolAgent;
