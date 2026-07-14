import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ContentBlockDeltaEventResponse extends ChatStreamingEventResponse {
  constructor({
    delta,
    index,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.CONTENT_BLOCK_DELTA.value,
    });
    this.delta = delta;
    this.index = index;
  }
}

export default ContentBlockDeltaEventResponse;
