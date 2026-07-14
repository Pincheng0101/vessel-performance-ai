import AgentToolMySqlClient from './AgentToolMySqlClient';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolMySqlClientResponse extends AgentToolMySqlClient {
  constructor({
    connector_id,
    database,
    description,
    display_name,
    name,
    read_only,
    tags,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      connectorId: connector_id,
      database,
      description,
      displayName: display_name,
      name,
      readOnly: read_only,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolMySqlClientResponse;
