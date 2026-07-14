import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ContentBlockStopEventResponse extends ChatStreamingEventResponse {
  constructor({
    index,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.CONTENT_BLOCK_STOP.value,
    });
    this.index = index;
  }
}

export default ContentBlockStopEventResponse;
