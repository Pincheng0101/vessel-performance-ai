class McpServerToolListRequest {
  static toRequestPayload(request) {
    return {
      mcp_server_id: request.mcpServerId,
      access_token: request.accessToken ?? null,
    };
  }
}

export default McpServerToolListRequest;
