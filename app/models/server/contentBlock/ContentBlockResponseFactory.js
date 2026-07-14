import { ContentBlockConstant } from '~/constants';
import AttachmentContentBlockResponse from './AttachmentContentBlockResponse';
import ContentBlockResponse from './ContentBlockResponse';
import ImageContentBlockResponse from './ImageContentBlockResponse';
import TextContentBlockResponse from './TextContentBlockResponse';

class ContentBlockResponseFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.content_block_type) {
      case ContentBlockConstant.Type.IMAGE.value:
        return new ImageContentBlockResponse(payload);
      case ContentBlockConstant.Type.TEXT.value:
        return new TextContentBlockResponse(payload);
      case ContentBlockConstant.Type.ATTACHMENT.value:
        return new AttachmentContentBlockResponse(payload);
      default:
        return new ContentBlockResponse(payload);
    }
  }
}

export default ContentBlockResponseFactory;
