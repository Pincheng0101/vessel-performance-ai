import { StreamingConstant } from '~/constants';
import StreamingContentBlockResponse from './StreamingContentBlockResponse';
import StreamingContentBlockResponseFactory from './StreamingContentBlockResponseFactory';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamingToolResultContentBlockResponse extends StreamingContentBlockResponse {
  constructor({
    content_block_name,
    content,
    display_name,
    is_error,
    tool_name,
  } = {}) {
    super({
      content_block_name,
      content_block_type: StreamingConstant.ContentBlockType.TOOL_RESULT.value,
    });
    this.content = Array.isArray(content)
      ? content.map(block => StreamingContentBlockResponseFactory.create({
          ...block,
          text: typeof block?.text === 'string' ? htmlUtils.unescape(block.text) : block?.text,
          data: htmlUtils.unescapeDeep(block?.data),
        }))
      : content;
    this.displayName = display_name;
    this.isError = is_error;
    this.toolName = tool_name;
  }

  get name() {
    return this.displayName || this.toolName;
  }
}

export default StreamingToolResultContentBlockResponse;
