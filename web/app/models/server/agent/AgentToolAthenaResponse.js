import AgentToolAthena from './AgentToolAthena';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolAthenaResponse extends AgentToolAthena {
  constructor({
    catalog,
    connector_id,
    database,
    description,
    display_name,
    name,
    output_location,
    read_only,
    tags,
    tool_type,
    track_tool_results,
    workgroup,
  } = {}) {
    super({
      catalog,
      connectorId: connector_id,
      database,
      description,
      displayName: display_name,
      name,
      outputLocation: output_location,
      readOnly: read_only,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
      workgroup,
    });
  }
}

export default AgentToolAthenaResponse;
