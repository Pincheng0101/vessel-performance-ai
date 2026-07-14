import McpServerAuthHeaderPayload from './McpServerAuthHeaderPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerAuthHeaderPayloadResponse extends McpServerAuthHeaderPayload {
  constructor({
    connector_id,
  } = {}) {
    super({
      connectorId: connector_id,
    });
  }
}

export default McpServerAuthHeaderPayloadResponse;
