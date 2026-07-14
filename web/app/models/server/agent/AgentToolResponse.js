import AgentTool from './AgentTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolResponse extends AgentTool {
  constructor({
    description,
    display_name,
    name,
    tags,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      description,
      displayName: display_name,
      name,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolResponse;
