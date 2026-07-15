import * as ContentBlockConstant from '~/constants/ContentBlockConstant';
import AttachmentContentBlock from './AttachmentContentBlock';
import ContentBlock from './ContentBlock';
import ImageContentBlock from './ImageContentBlock';
import TextContentBlock from './TextContentBlock';

class ContentBlockFactory {
  /**
   * @param {ContentBlock} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.contentBlockType) {
      case ContentBlockConstant.Type.IMAGE.value:
        return new ImageContentBlock(payload);
      case ContentBlockConstant.Type.TEXT.value:
        return new TextContentBlock(payload);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return new AttachmentContentBlock(payload);
      default:
        return new ContentBlock(payload);
    }
  }

  /**
   * @param {ContentBlock} contentBlock
   */
  static toRequestPayload(contentBlock) {
    switch (contentBlock.contentBlockType) {
      case ContentBlockConstant.Type.IMAGE.value:
        return ImageContentBlock.toRequestPayload(contentBlock);
      case ContentBlockConstant.Type.TEXT.value:
        return TextContentBlock.toRequestPayload(contentBlock);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return AttachmentContentBlock.toRequestPayload(contentBlock);
      default:
        return ContentBlock.toRequestPayload(contentBlock);
    }
  }
}

export default ContentBlockFactory;
