import MySqlMcpServerCustomTool from './MySqlMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MySqlMcpServerCustomToolResponse extends MySqlMcpServerCustomTool {
  constructor({
    args,
    connector_id,
    custom_tool_type,
    database,
    description,
    name,
    query,
    read_only,
  } = {}) {
    super({
      args,
      connectorId: connector_id,
      customToolType: custom_tool_type,
      database,
      description,
      name,
      query,
      readOnly: read_only,
    });
  }
}

export default MySqlMcpServerCustomToolResponse;
