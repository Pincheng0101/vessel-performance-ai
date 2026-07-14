import { StreamingConstant } from '~/constants';
import StreamingContentBlockResponse from './StreamingContentBlockResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamingTextContentBlockResponse extends StreamingContentBlockResponse {
  constructor({
    content_block_name,
    text,
  } = {}) {
    super({
      content_block_name,
      content_block_type: StreamingConstant.ContentBlockType.TEXT.value,
    });
    this.text = text;
  }
}

export default StreamingTextContentBlockResponse;
