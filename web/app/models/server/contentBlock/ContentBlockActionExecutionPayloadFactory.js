import * as ContentBlockConstant from '~/constants/ContentBlockConstant';
import AttachmentContentBlockActionExecutionPayload from './AttachmentContentBlockActionExecutionPayload';
import ContentBlockActionExecutionPayload from './ContentBlockActionExecutionPayload';
import ImageContentBlockActionExecutionPayload from './ImageContentBlockActionExecutionPayload';
import TextContentBlockActionExecutionPayload from './TextContentBlockActionExecutionPayload';

class ContentBlockActionExecutionPayloadFactory {
  /**
   * @param {ContentBlockActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.contentBlockType) {
      case ContentBlockConstant.Type.IMAGE.value:
        return new ImageContentBlockActionExecutionPayload(payload);
      case ContentBlockConstant.Type.TEXT.value:
        return new TextContentBlockActionExecutionPayload(payload);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return new AttachmentContentBlockActionExecutionPayload(payload);
      default:
        return new ContentBlockActionExecutionPayload(payload);
    }
  }

  /**
   * @param {ContentBlockActionExecutionPayload} contentBlock
   */
  static toRequestPayload(contentBlock) {
    switch (contentBlock.contentBlockType) {
      case ContentBlockConstant.Type.IMAGE.value:
        return ImageContentBlockActionExecutionPayload.toRequestPayload(contentBlock);
      case ContentBlockConstant.Type.TEXT.value:
        return TextContentBlockActionExecutionPayload.toRequestPayload(contentBlock);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return AttachmentContentBlockActionExecutionPayload.toRequestPayload(contentBlock);
      default:
        return ContentBlockActionExecutionPayload.toRequestPayload(contentBlock);
    }
  }
}

export default ContentBlockActionExecutionPayloadFactory;
