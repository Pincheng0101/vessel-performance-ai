import { TemplateRenderBlockActionExecutionPayloadResponse } from '~/models/server/templateRenderBlock';
import TextContentBlock from './TextContentBlock';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TextContentBlockResponse extends TextContentBlock {
  constructor({
    content_block_name,
    prompt_template,
    text,
  } = {}) {
    super({
      contentBlockName: content_block_name,
      promptTemplate: prompt_template ? new TemplateRenderBlockActionExecutionPayloadResponse(prompt_template) : prompt_template,
      text,
    });
  }
}

export default TextContentBlockResponse;
