import * as ContentBlockConstant from '~/constants/ContentBlockConstant';
import ContentBlock from './ContentBlock';

class ImageContentBlock extends ContentBlock {
  constructor({
    contentBlockName,
    data,
    detail,
    maxHeightPx,
    maxWidthPx,
    url,
  } = {}) {
    super({
      contentBlockType: ContentBlockConstant.Type.IMAGE.value,
      contentBlockName,
    });
    this.data = data;
    this.detail = detail;
    this.maxHeightPx = maxHeightPx;
    this.maxWidthPx = maxWidthPx;
    this.url = url;
  }

  /**
   * @param {ImageContentBlock} imageContentBlock
   */
  static toRequestPayload(imageContentBlock) {
    return {
      ...super.toRequestPayload(imageContentBlock),
      data: imageContentBlock.data,
      detail: imageContentBlock.detail,
      max_height_px: imageContentBlock.maxHeightPx,
      max_width_px: imageContentBlock.maxWidthPx,
      url: imageContentBlock.url,
    };
  }
}

export default ImageContentBlock;
