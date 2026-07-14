class McpServerAuthHeaderPayload {
  constructor({
    connectorId,
  } = {}) {
    this.connectorId = connectorId ?? null;
  }

  /**
   * @param {McpServerAuthHeaderPayload} payload
   */
  static toRequestPayload(payload) {
    return {
      connector_id: payload.connectorId,
    };
  }
}

export default McpServerAuthHeaderPayload;
