import ImageContentBlock from './ImageContentBlock';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ImageContentBlockResponse extends ImageContentBlock {
  constructor({
    content_block_name,
    data,
    detail,
    max_height_px,
    max_width_px,
    url,
  } = {}) {
    super({
      contentBlockName: content_block_name,
      data,
      detail,
      maxHeightPx: max_height_px,
      maxWidthPx: max_width_px,
      url,
    });
  }
}

export default ImageContentBlockResponse;
