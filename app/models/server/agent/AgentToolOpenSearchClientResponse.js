import AgentToolOpenSearchClient from './AgentToolOpenSearchClient';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolOpenSearchClientResponse extends AgentToolOpenSearchClient {
  constructor({
    connector_id,
    description,
    display_name,
    is_cache_connection,
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
      isCacheConnection: is_cache_connection,
      name,
      tags,
      timeout,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolOpenSearchClientResponse;
