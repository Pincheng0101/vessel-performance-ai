import * as StreamingConstant from '~/constants/StreamingConstant';
import StreamingContentBlockResponse from './StreamingContentBlockResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamingToolUseContentBlockResponse extends StreamingContentBlockResponse {
  constructor({
    content_block_name,
    display_name,
    tool_input,
    tool_name,
  } = {}) {
    super({
      content_block_name,
      content_block_type: StreamingConstant.ContentBlockType.TOOL_USE.value,
    });
    this.displayName = display_name;
    this.toolInput = htmlUtils.unescapeDeep(tool_input);
    this.toolName = tool_name;
  }

  get name() {
    return this.displayName || this.toolName;
  }
}

export default StreamingToolUseContentBlockResponse;
