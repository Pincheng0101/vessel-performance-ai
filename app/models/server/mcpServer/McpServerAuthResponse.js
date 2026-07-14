import { McpServerConstant } from '~/constants';
import McpServerAuth from './McpServerAuth';
import McpServerAuthHeaderPayloadResponse from './McpServerAuthHeaderPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerAuthResponse extends McpServerAuth {
  constructor({
    auth_type,
    auth_payload,
  } = {}) {
    super({
      authType: auth_type,
      authPayload: auth_type === McpServerConstant.StreamableHttpAuthType.HEADER.value && auth_payload
        ? new McpServerAuthHeaderPayloadResponse(auth_payload)
        : null,
    });
  }
}

export default McpServerAuthResponse;
