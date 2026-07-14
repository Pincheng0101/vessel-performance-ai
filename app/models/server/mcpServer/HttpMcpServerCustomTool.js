import McpServerCustomTool from './McpServerCustomTool';

class HttpMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    body,
    connectorId,
    customToolType,
    description,
    headers,
    inputSchema,
    method,
    name,
    params,
    url,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.body = body ?? null;
    this.connectorId = connectorId ?? null;
    this.headers = headers ?? null;
    this.inputSchema = inputSchema ?? null;
    this.method = method ?? '';
    this.params = params ?? null;
    this.url = url ?? null;
  }

  /**
   * @param {HttpMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      body: resource.body,
      connector_id: resource.connectorId,
      headers: resource.headers,
      input_schema: resource.inputSchema,
      method: resource.method,
      params: resource.params,
      url: resource.url,
    };
  }
}

export default HttpMcpServerCustomTool;
