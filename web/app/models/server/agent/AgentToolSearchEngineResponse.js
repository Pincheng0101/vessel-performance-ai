import AgentToolSearchEngine from './AgentToolSearchEngine';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolSearchEngineResponse extends AgentToolSearchEngine {
  constructor({
    description,
    display_name,
    name,
    search_engine_id,
    tags,
    track_tool_results,
    tool_type,
  } = {}) {
    super({
      description,
      displayName: display_name,
      name,
      searchEngineId: search_engine_id,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolSearchEngineResponse;
