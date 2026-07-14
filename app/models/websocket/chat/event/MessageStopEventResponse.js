import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MessageStopEventResponse extends ChatStreamingEventResponse {
  constructor({
    stop_reason,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.MESSAGE_STOP.value,
    });
    this.stopReason = stop_reason;
  }
}

export default MessageStopEventResponse;
