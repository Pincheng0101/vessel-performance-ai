import * as ContentBlockConstant from '~/constants/ContentBlockConstant';
import AttachmentContentBlockActionExecutionPayloadResponse from './AttachmentContentBlockActionExecutionPayloadResponse';
import ContentBlockActionExecutionPayloadResponse from './ContentBlockActionExecutionPayloadResponse';
import ImageContentBlockActionExecutionPayloadResponse from './ImageContentBlockActionExecutionPayloadResponse';
import TextContentBlockActionExecutionPayloadResponse from './TextContentBlockActionExecutionPayloadResponse';

class ContentBlockActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.content_block_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.content_block_type) {
      case ContentBlockConstant.Type.IMAGE.value:
        return new ImageContentBlockActionExecutionPayloadResponse(normalized);
      case ContentBlockConstant.Type.TEXT.value:
        return new TextContentBlockActionExecutionPayloadResponse(normalized);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return new AttachmentContentBlockActionExecutionPayloadResponse(normalized);
      default:
        return new ContentBlockActionExecutionPayloadResponse(normalized);
    }
  }
}

export default ContentBlockActionExecutionPayloadResponseFactory;
