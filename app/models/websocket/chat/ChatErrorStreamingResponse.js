import { StreamingConstant } from '~/constants';
import ChatStreamingResponse from './ChatStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatErrorStreamingResponse extends ChatStreamingResponse {
  constructor({
    error,
    status_code,
  } = {}) {
    super({
      action: StreamingConstant.Action.CHAT.value,
      error,
      response_type: StreamingConstant.ResponseType.ERROR.value,
    });
    this.statusCode = status_code;
  }
}

export default ChatErrorStreamingResponse;
