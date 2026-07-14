import OpenSearchMcpServerCustomTool from './OpenSearchMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenSearchMcpServerCustomToolResponse extends OpenSearchMcpServerCustomTool {
  constructor({
    body,
    connector_id,
    custom_tool_type,
    description,
    headers,
    is_cache_connection,
    method,
    name,
    params,
    read_only,
    url_path,
  } = {}) {
    super({
      body,
      connectorId: connector_id,
      customToolType: custom_tool_type,
      description,
      headers,
      isCacheConnection: is_cache_connection,
      method,
      name,
      params,
      readOnly: read_only,
      urlPath: url_path,
    });
  }
}

export default OpenSearchMcpServerCustomToolResponse;
