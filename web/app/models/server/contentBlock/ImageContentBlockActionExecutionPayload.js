import ContentBlockActionExecutionPayload from './ContentBlockActionExecutionPayload';

class ImageContentBlockActionExecutionPayload extends ContentBlockActionExecutionPayload {
  constructor({
    contentBlockName,
    contentBlockType,
    data,
    detail,
    maxHeightPx,
    maxWidthPx,
    url,
  } = {}) {
    super({
      contentBlockName,
      contentBlockType,
    });
    this.data = data;
    this.detail = detail;
    this.maxHeightPx = maxHeightPx;
    this.maxWidthPx = maxWidthPx;
    this.url = url;
  }

  /**
   * @param {ImageContentBlockActionExecutionPayload} imageContentBlock
   */
  static toRequestPayload(imageContentBlock) {
    return {
      ...super.toRequestPayload(imageContentBlock),
      data: imageContentBlock.data,
      detail: imageContentBlock.detail,
      maxHeightPx: imageContentBlock.maxHeightPx,
      maxWidthPx: imageContentBlock.maxWidthPx,
      url: imageContentBlock.url,
    };
  }
}

export default ImageContentBlockActionExecutionPayload;
