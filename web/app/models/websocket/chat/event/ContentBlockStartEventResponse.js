import { StreamingConstant } from '~/constants';
import { StreamingContentBlockResponseFactory } from '~/models/websocket/chat/contentBlock';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ContentBlockStartEventResponse extends ChatStreamingEventResponse {
  constructor({
    content_block,
    index,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.CONTENT_BLOCK_START.value,
    });
    this.index = index;
    this.contentBlock = StreamingContentBlockResponseFactory.create(content_block);
  }
}

export default ContentBlockStartEventResponse;
