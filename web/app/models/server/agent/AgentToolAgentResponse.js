import AgentToolAgent from './AgentToolAgent';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolAgentResponse extends AgentToolAgent {
  constructor({
    agent_id,
    description,
    display_name,
    name,
    tags,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      agentId: agent_id,
      description,
      displayName: display_name,
      name,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolAgentResponse;
