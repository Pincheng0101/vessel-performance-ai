class ContentBlock {
  constructor({
    contentBlockName,
    contentBlockType,
  } = {}) {
    this.contentBlockName = contentBlockName;
    this.contentBlockType = contentBlockType;
  }

  /**
   * @param {ContentBlock} contentBlock
   */
  static toRequestPayload(contentBlock) {
    return {
      content_block_name: contentBlock.contentBlockName,
      content_block_type: contentBlock.contentBlockType,
    };
  }
}

export default ContentBlock;
