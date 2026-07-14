import McpServerCustomTool from './McpServerCustomTool';

class OpenSearchMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    body,
    connectorId,
    customToolType,
    description,
    headers,
    isCacheConnection,
    method,
    name,
    params,
    readOnly,
    urlPath,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.body = body ?? null;
    this.connectorId = connectorId ?? '';
    this.headers = headers ?? null;
    this.isCacheConnection = isCacheConnection ?? true;
    this.method = method ?? '';
    this.params = params ?? null;
    this.readOnly = readOnly ?? true;
    this.urlPath = urlPath ?? '';
  }

  /**
   * @param {OpenSearchMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      body: resource.body,
      connector_id: resource.connectorId,
      headers: resource.headers,
      is_cache_connection: resource.isCacheConnection,
      method: resource.method,
      params: resource.params,
      read_only: resource.readOnly,
      url_path: resource.urlPath,
    };
  }
}

export default OpenSearchMcpServerCustomTool;
