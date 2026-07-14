import AgentToolHttpClient from './AgentToolHttpClient';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolHttpClientResponse extends AgentToolHttpClient {
  constructor({
    connector_id,
    description,
    display_name,
    headers,
    name,
    tags,
    timeout,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      connectorId: connector_id,
      description,
      displayName: display_name,
      headers,
      name,
      tags,
      timeout,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolHttpClientResponse;
