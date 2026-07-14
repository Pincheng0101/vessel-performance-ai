import ContentBlock from './ContentBlock';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ContentBlockResponse extends ContentBlock {
  constructor({
    content_block_name,
    content_block_type,
  } = {}) {
    super({
      contentBlockName: content_block_name,
      contentBlockType: content_block_type,
    });
  }
}

export default ContentBlockResponse;
