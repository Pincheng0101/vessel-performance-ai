import ContentBlockActionExecutionPayloadResponse from './ContentBlockActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AttachmentContentBlockActionExecutionPayloadResponse extends ContentBlockActionExecutionPayloadResponse {
  constructor({
    content_block_name,
    content_block_type,
    object_paths,
    parser_type,
    skip_invalid_attachment,
    storage_id,
  } = {}) {
    super({
      content_block_name,
      content_block_type,
    });
    this.objectPaths = object_paths;
    this.parserType = parser_type;
    this.skipInvalidAttachment = skip_invalid_attachment;
    this.storageId = storage_id;
  }
}

export default AttachmentContentBlockActionExecutionPayloadResponse;
