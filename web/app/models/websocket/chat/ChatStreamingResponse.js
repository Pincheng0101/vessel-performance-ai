import { StreamingConstant } from '~/constants';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatStreamingResponse {
  action = StreamingConstant.Action.CHAT.value;

  constructor({
    action,
    agent_id,
    error,
    response_type,
    session_id,
    source,
    timestamp,
    username,
  } = {}) {
    this.action = action;
    this.agentId = agent_id;
    this.error = error;
    this.responseType = response_type;
    this.sessionId = session_id;
    this.source = source;
    this.timestamp = timestamp || Date.now();
    this.username = username;
  }

  get id() {
    return this.timestamp;
  }
}

export default ChatStreamingResponse;
