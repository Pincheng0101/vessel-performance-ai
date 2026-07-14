import McpServerAuth from './McpServerAuth';

class McpServerValidateRequest {
  static toRequestPayload({ mcpServerType, endpointUrl, auth, accessToken }) {
    return {
      mcp_server_type: mcpServerType,
      endpoint_url: endpointUrl,
      auth: auth ? McpServerAuth.toRequestPayload(auth) : null,
      access_token: accessToken ?? null,
    };
  }
}

export default McpServerValidateRequest;
