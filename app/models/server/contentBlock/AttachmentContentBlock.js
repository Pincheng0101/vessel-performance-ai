import { ContentBlockConstant } from '~/constants';
import ContentBlock from './ContentBlock';

class AttachmentContentBlock extends ContentBlock {
  constructor({
    contentBlockName,
    maxHeightPx,
    maxWidthPx,
    objectPaths,
    parserType,
    skipInvalidAttachment,
    storageId,
  } = {}) {
    super({
      contentBlockType: ContentBlockConstant.Type.ATTACHMENT.value,
      contentBlockName,
    });
    this.objectPaths = objectPaths;
    this.parserType = parserType;
    this.skipInvalidAttachment = skipInvalidAttachment;
    this.storageId = storageId;
    this.maxHeightPx = maxHeightPx;
    this.maxWidthPx = maxWidthPx;
  }

  /**
   * @param {AttachmentContentBlock} attachmentContentBlock
   */
  static toRequestPayload(attachmentContentBlock) {
    return {
      ...super.toRequestPayload(attachmentContentBlock),
      object_paths: attachmentContentBlock.objectPaths,
      parser_type: attachmentContentBlock.parserType,
      skip_invalid_attachment: attachmentContentBlock.skipInvalidAttachment,
      storage_id: attachmentContentBlock.storageId,
      max_height_px: attachmentContentBlock.maxHeightPx,
      max_width_px: attachmentContentBlock.maxWidthPx,
    };
  }
}

export default AttachmentContentBlock;
