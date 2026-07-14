import McpServerCustomTool from './McpServerCustomTool';

class MySqlMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    args,
    connectorId,
    customToolType,
    database,
    description,
    name,
    query,
    readOnly,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.args = args ?? null;
    this.connectorId = connectorId ?? '';
    this.database = database ?? null;
    this.query = query ?? '';
    this.readOnly = readOnly ?? true;
  }

  /**
   * @param {MySqlMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      args: resource.args,
      connector_id: resource.connectorId,
      database: resource.database,
      query: resource.query,
      read_only: resource.readOnly,
    };
  }
}

export default MySqlMcpServerCustomTool;
