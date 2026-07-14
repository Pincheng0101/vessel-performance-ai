import AthenaMcpServerCustomTool from './AthenaMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AthenaMcpServerCustomToolResponse extends AthenaMcpServerCustomTool {
  constructor({
    catalog,
    connector_id,
    custom_tool_type,
    database,
    description,
    name,
    output_location,
    read_only,
    workgroup,
  } = {}) {
    super({
      catalog,
      connectorId: connector_id,
      customToolType: custom_tool_type,
      database,
      description,
      name,
      outputLocation: output_location,
      readOnly: read_only,
      workgroup,
    });
  }
}

export default AthenaMcpServerCustomToolResponse;
