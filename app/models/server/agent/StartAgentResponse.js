import StartAgent from './StartAgent';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StartAgentResponse extends StartAgent {
  constructor({
    agent_id,
    session_id,
    url,
    user,
  } = {}) {
    super({
      agentId: agent_id,
      sessionId: session_id,
      url,
      user,
    });
  }
}

export default StartAgentResponse;
