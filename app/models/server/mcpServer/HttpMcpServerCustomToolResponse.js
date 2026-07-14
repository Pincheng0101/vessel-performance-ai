import HttpMcpServerCustomTool from './HttpMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class HttpMcpServerCustomToolResponse extends HttpMcpServerCustomTool {
  constructor({
    body,
    connector_id,
    custom_tool_type,
    description,
    headers,
    input_schema,
    method,
    name,
    params,
    url,
  } = {}) {
    super({
      body,
      connectorId: connector_id,
      customToolType: custom_tool_type,
      description,
      headers,
      inputSchema: input_schema,
      method,
      name,
      params,
      url,
    });
  }
}

export default HttpMcpServerCustomToolResponse;
