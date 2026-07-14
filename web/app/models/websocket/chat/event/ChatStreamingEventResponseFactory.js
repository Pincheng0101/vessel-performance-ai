import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';
import ContentBlockDeltaEventResponse from './ContentBlockDeltaEventResponse';
import ContentBlockStartEventResponse from './ContentBlockStartEventResponse';
import ContentBlockStopEventResponse from './ContentBlockStopEventResponse';
import ErrorEventResponse from './ErrorEventResponse';
import MessageStartEventResponse from './MessageStartEventResponse';
import MessageStopEventResponse from './MessageStopEventResponse';
import ToolResultsEventResponse from './ToolResultsEventResponse';

class ChatStreamingEventResponseFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.event_type) {
      case StreamingConstant.EventType.MESSAGE_START.value:
        return new MessageStartEventResponse(payload);
      case StreamingConstant.EventType.MESSAGE_STOP.value:
        return new MessageStopEventResponse(payload);
      case StreamingConstant.EventType.CONTENT_BLOCK_START.value:
        return new ContentBlockStartEventResponse(payload);
      case StreamingConstant.EventType.CONTENT_BLOCK_DELTA.value:
        return new ContentBlockDeltaEventResponse(payload);
      case StreamingConstant.EventType.CONTENT_BLOCK_STOP.value:
        return new ContentBlockStopEventResponse(payload);
      case StreamingConstant.EventType.TOOL_RESULTS.value:
        return new ToolResultsEventResponse(payload);
      case StreamingConstant.EventType.ERROR.value:
        return new ErrorEventResponse(payload);
      default:
        return new ChatStreamingEventResponse(payload);
    }
  }
}

export default ChatStreamingEventResponseFactory;
