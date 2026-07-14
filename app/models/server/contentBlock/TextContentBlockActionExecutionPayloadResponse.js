import { TemplateRenderBlockActionExecutionPayloadResponse } from '~/models/server/templateRenderBlock';
import ContentBlockActionExecutionPayloadResponse from './ContentBlockActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TextContentBlockActionExecutionPayloadResponse extends ContentBlockActionExecutionPayloadResponse {
  constructor({
    content_block_name,
    content_block_type,
    text,
    prompt_template,
  } = {}) {
    super({
      content_block_name,
      content_block_type,
    });
    this.text = text;
    this.promptTemplate = prompt_template ? new TemplateRenderBlockActionExecutionPayloadResponse(prompt_template) : prompt_template;
  }
}

export default TextContentBlockActionExecutionPayloadResponse;
