import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MessageStartEventResponse extends ChatStreamingEventResponse {
  constructor({
    message,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.MESSAGE_START.value,
    });
    this.message = message;
  }
}

export default MessageStartEventResponse;
