import { StreamingConstant } from '~/constants';
import { MessageResponseFactory } from '~/models/server/message';
import ChatStreamingResponse from './ChatStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatStartStreamingResponse extends ChatStreamingResponse {
  constructor({
    agent_id,
    execution_id,
    messages,
    session_id,
    source,
    timestamp,
    username,
  } = {}) {
    super({
      action: StreamingConstant.Action.CHAT.value,
      agent_id,
      response_type: StreamingConstant.ResponseType.START.value,
      session_id,
      source,
      timestamp,
      username,
    });
    this.executionId = execution_id;
    this.messages = Array.isArray(messages) ? messages.map(MessageResponseFactory.create) : messages;
  }
}

export default ChatStartStreamingResponse;
