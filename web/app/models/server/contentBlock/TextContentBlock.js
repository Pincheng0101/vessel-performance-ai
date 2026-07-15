import * as ContentBlockConstant from '~/constants/ContentBlockConstant';
import ContentBlock from './ContentBlock';

class TextContentBlock extends ContentBlock {
  constructor({
    contentBlockName,
    promptTemplate,
    text,
  } = {}) {
    super({
      contentBlockType: ContentBlockConstant.Type.TEXT.value,
      contentBlockName,
    });
    this.promptTemplate = promptTemplate;
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

export default TextContentBlock;
