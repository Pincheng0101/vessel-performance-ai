import { StreamingConstant } from '~/constants';
import ChatStreamingResponse from './ChatStreamingResponse';
import { ChatStreamingEventResponseFactory } from './event';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatDataStreamingResponse extends ChatStreamingResponse {
  constructor({
    agent_id,
    event,
    session_id,
    source,
    timestamp,
    username,
  } = {}) {
    super({
      action: StreamingConstant.Action.CHAT.value,
      agent_id,
      response_type: StreamingConstant.ResponseType.DATA.value,
      session_id,
      source,
      timestamp,
      username,
    });
    this.event = ChatStreamingEventResponseFactory.create(event);
  }
}

export default ChatDataStreamingResponse;
