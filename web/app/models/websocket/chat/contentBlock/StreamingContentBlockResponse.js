/**
 * This class receives data from the API with parameters in snake_case.
 */
class StreamingContentBlockResponse {
  constructor({
    content_block_name,
    content_block_type,
  } = {}) {
    this.contentBlockName = content_block_name;
    this.contentBlockType = content_block_type;
  }
}

export default StreamingContentBlockResponse;
