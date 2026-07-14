import { TemplateRenderBlockActionExecutionPayload } from '~/models/server/templateRenderBlock';
import ContentBlockActionExecutionPayload from './ContentBlockActionExecutionPayload';

class TextContentBlockActionExecutionPayload extends ContentBlockActionExecutionPayload {
  constructor({
    contentBlockName,
    contentBlockType,
    promptTemplate,
    text,
  } = {}) {
    super({
      contentBlockName,
      contentBlockType,
    });
    this.promptTemplate = promptTemplate ? new TemplateRenderBlockActionExecutionPayload(promptTemplate) : promptTemplate;
    this.text = text;
  }

  /**
   * @param {TextContentBlockActionExecutionPayload} textContentBlock
   */
  static toRequestPayload(textContentBlock) {
    return {
      ...super.toRequestPayload(textContentBlock),
      prompt_template: textContentBlock.promptTemplate ? TemplateRenderBlockActionExecutionPayload.toRequestPayload(textContentBlock.promptTemplate) : textContentBlock.promptTemplate,
      text: textContentBlock.text,
    };
  }
}

export default TextContentBlockActionExecutionPayload;
