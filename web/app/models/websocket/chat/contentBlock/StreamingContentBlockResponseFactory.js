import { StreamingConstant } from '~/constants';
import StreamingContentBlockResponse from './StreamingContentBlockResponse';
import StreamingObjectContentBlockResponse from './StreamingObjectContentBlockResponse';
import StreamingTextContentBlockResponse from './StreamingTextContentBlockResponse';
import StreamingToolResultContentBlockResponse from './StreamingToolResultContentBlockResponse';
import StreamingToolUseContentBlockResponse from './StreamingToolUseContentBlockResponse';

class StreamingContentBlockResponseFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.content_block_type) {
      case StreamingConstant.ContentBlockType.TEXT.value:
        return new StreamingTextContentBlockResponse(payload);
      case StreamingConstant.ContentBlockType.TOOL_USE.value:
        return new StreamingToolUseContentBlockResponse(payload);
      case StreamingConstant.ContentBlockType.TOOL_RESULT.value:
        return new StreamingToolResultContentBlockResponse(payload);
      case StreamingConstant.ContentBlockType.OBJECT.value:
        return new StreamingObjectContentBlockResponse(payload);
      default:
        return new StreamingContentBlockResponse(payload);
    }
  }
}

export default StreamingContentBlockResponseFactory;
