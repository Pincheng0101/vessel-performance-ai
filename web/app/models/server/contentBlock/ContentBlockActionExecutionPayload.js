import ContentBlock from './ContentBlock';

class ContentBlockActionExecutionPayload extends ContentBlock {
  constructor({
    contentBlockName,
    contentBlockType,
  } = {}) {
    super({
      contentBlockName,
      contentBlockType,
    });
  }

  /**
   * @param {ContentBlockActionExecutionPayload} contentBlock
   */
  static toRequestPayload(contentBlock) {
    return {
      content_block_name: contentBlock.contentBlockName,
      content_block_type: contentBlock.contentBlockType,
    };
  }
}

export default ContentBlockActionExecutionPayload;
