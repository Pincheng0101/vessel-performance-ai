import * as StreamingConstant from '~/constants/StreamingConstant';
import StreamingContentBlockResponse from './StreamingContentBlockResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamingObjectContentBlockResponse extends StreamingContentBlockResponse {
  constructor({
    content_block_name,
    data,
  } = {}) {
    super({
      content_block_name,
      content_block_type: StreamingConstant.ContentBlockType.OBJECT.value,
    });
    this.data = data;
  }
}

export default StreamingObjectContentBlockResponse;
