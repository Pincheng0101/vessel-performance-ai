import StartHqCopilotAgent from './StartHqCopilotAgent';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StartHqCopilotAgentResponse extends StartHqCopilotAgent {
  constructor({
    url,
    agent_id,
    session_id,
    user,
  } = {}) {
    super({
      url,
      agentId: agent_id,
      sessionId: session_id,
      user,
    });
  }
}

export default StartHqCopilotAgentResponse;
