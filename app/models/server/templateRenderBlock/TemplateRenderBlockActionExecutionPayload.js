class TemplateRenderBlockActionExecutionPayload {
  constructor({
    template,
    templateId,
    templateVariables,
  } = {}) {
    this.template = template;
    this.templateId = templateId;
    this.templateVariables = templateVariables;
  }

  /**
   * @param {TemplateRenderBlockActionExecutionPayload} templateRenderBlock
   */
  static toRequestPayload(templateRenderBlock) {
    return {
      template: templateRenderBlock.template,
      template_id: templateRenderBlock.templateId,
      template_variables: templateRenderBlock.templateVariables,
    };
  }
}

export default TemplateRenderBlockActionExecutionPayload;
