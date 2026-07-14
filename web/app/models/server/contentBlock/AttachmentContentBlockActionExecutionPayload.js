import ContentBlockActionExecutionPayload from './ContentBlockActionExecutionPayload';

class AttachmentContentBlockActionExecutionPayload extends ContentBlockActionExecutionPayload {
  constructor({
    contentBlockName,
    contentBlockType,
    objectPaths,
    parserType,
    skipInvalidAttachment,
    storageId,
  } = {}) {
    super({
      contentBlockName,
      contentBlockType,
    });
    this.objectPaths = objectPaths;
    this.parserType = parserType;
    this.skipInvalidAttachment = skipInvalidAttachment;
    this.storageId = storageId;
  }

  /**
   * @param {AttachmentContentBlockActionExecutionPayload} attachmentContentBlock
   */
  static toRequestPayload(attachmentContentBlock) {
    return {
      ...super.toRequestPayload(attachmentContentBlock),
      object_paths: attachmentContentBlock.objectPaths,
      parser_type: attachmentContentBlock.parserType,
      skip_invalid_attachment: attachmentContentBlock.skipInvalidAttachment,
      storage_id: attachmentContentBlock.storageId,
    };
  }
}

export default AttachmentContentBlockActionExecutionPayload;
