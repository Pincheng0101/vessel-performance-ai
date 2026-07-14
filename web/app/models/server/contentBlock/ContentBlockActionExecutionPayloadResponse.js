import ContentBlockActionExecutionPayload from './ContentBlockActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ContentBlockActionExecutionPayloadResponse extends ContentBlockActionExecutionPayload {
  constructor({
    content_block_name,
    content_block_type,
  } = {}) {
    super({
      contentBlockName: content_block_name,
      contentBlockType: content_block_type,
    });
  }
}

export default ContentBlockActionExecutionPayloadResponse;
