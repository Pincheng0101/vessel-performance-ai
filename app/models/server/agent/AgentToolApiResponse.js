import AgentToolApi from './AgentToolApi';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolApiResponse extends AgentToolApi {
  constructor({
    body,
    connector_id,
    description,
    display_name,
    headers,
    input_schema,
    method,
    name,
    params,
    tags,
    timeout,
    tool_type,
    track_tool_results,
    url,
  } = {}) {
    super({
      body,
      connectorId: connector_id,
      description,
      displayName: display_name,
      headers,
      inputSchema: input_schema,
      method,
      name,
      params,
      tags,
      timeout,
      toolType: tool_type,
      trackToolResults: track_tool_results,
      url,
    });
  }
}

export default AgentToolApiResponse;
