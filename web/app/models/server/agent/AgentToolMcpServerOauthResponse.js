import AgentToolMcpServerOauth from './AgentToolMcpServerOauth';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolMcpServerOauthResponse extends AgentToolMcpServerOauth {
  constructor({
    auth_type,
    endpoint,
  } = {}) {
    super({
      authType: auth_type,
      endpoint,
    });
  }
}

export default AgentToolMcpServerOauthResponse;
