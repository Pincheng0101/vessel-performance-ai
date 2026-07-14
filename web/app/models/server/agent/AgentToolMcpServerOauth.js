class AgentToolMcpServerOauth {
  constructor({
    authType,
    endpoint,
  } = {}) {
    this.authType = authType ?? null;
    this.endpoint = endpoint ?? null;
  }
}

export default AgentToolMcpServerOauth;
