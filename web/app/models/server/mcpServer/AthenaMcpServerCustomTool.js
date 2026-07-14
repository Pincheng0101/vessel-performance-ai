import McpServerCustomTool from './McpServerCustomTool';

class AthenaMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    catalog,
    connectorId,
    customToolType,
    database,
    description,
    name,
    outputLocation,
    readOnly,
    workgroup,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.catalog = catalog ?? null;
    this.connectorId = connectorId ?? null;
    this.database = database ?? null;
    this.outputLocation = outputLocation ?? null;
    this.readOnly = readOnly ?? true;
    this.workgroup = workgroup ?? null;
  }

  /**
   * @param {AthenaMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      catalog: resource.catalog,
      connector_id: resource.connectorId,
      database: resource.database,
      output_location: resource.outputLocation,
      read_only: resource.readOnly,
      workgroup: resource.workgroup,
    };
  }
}

export default AthenaMcpServerCustomTool;
