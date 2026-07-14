import AttachmentContentBlock from './AttachmentContentBlock';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AttachmentContentBlockResponse extends AttachmentContentBlock {
  constructor({
    content_block_name,
    max_height_px,
    max_width_px,
    object_paths,
    parser_type,
    skip_invalid_attachment,
    storage_id,
  } = {}) {
    super({
      contentBlockName: content_block_name,
      maxHeightPx: max_height_px,
      maxWidthPx: max_width_px,
      objectPaths: object_paths,
      parserType: parser_type,
      skipInvalidAttachment: skip_invalid_attachment,
      storageId: storage_id,
    });
  }
}

export default AttachmentContentBlockResponse;
