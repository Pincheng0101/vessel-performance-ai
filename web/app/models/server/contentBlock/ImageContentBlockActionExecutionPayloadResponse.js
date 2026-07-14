import ContentBlockActionExecutionPayloadResponse from './ContentBlockActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ImageContentBlockActionExecutionPayloadResponse extends ContentBlockActionExecutionPayloadResponse {
  constructor({
    content_block_name,
    content_block_type,
    data,
    detail,
    max_height_px,
    max_width_px,
    url,
  } = {}) {
    super({
      content_block_name,
      content_block_type,
    });
    this.data = data;
    this.detail = detail;
    this.maxHeightPx = max_height_px;
    this.maxWidthPx = max_width_px;
    this.url = url;
  }
}

export default ImageContentBlockActionExecutionPayloadResponse;
