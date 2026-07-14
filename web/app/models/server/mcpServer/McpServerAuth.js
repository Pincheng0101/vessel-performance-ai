import McpServerAuthHeaderPayload from './McpServerAuthHeaderPayload';

class McpServerAuth {
  constructor({
    authType,
    authPayload,
  } = {}) {
    this.authType = authType ?? null;
    this.authPayload = authPayload instanceof McpServerAuthHeaderPayload ? authPayload : null;
  }

  /**
   * @param {McpServerAuth} auth
   */
  static toRequestPayload(auth) {
    return {
      auth_type: auth.authType,
      auth_payload: auth.authPayload
        ? McpServerAuthHeaderPayload.toRequestPayload(auth.authPayload)
        : null,
    };
  }
}

export default McpServerAuth;
