class McpServerToolCallRequest {
  static toRequestPayload(request) {
    return {
      input: request.input,
      mcp_server_id: request.mcpServerId,
      tool_name: request.toolName,
      access_token: request.accessToken ?? null,
    };
  }
}

export default McpServerToolCallRequest;
