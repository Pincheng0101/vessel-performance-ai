import TemplateRenderBlockActionExecutionPayload from './TemplateRenderBlockActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TemplateRenderBlockActionExecutionPayloadResponse extends TemplateRenderBlockActionExecutionPayload {
  constructor({
    template,
    template_id,
    template_variables,
  } = {}) {
    super({
      template,
      templateId: template_id,
      templateVariables: template_variables,
    });
  }
}

export default TemplateRenderBlockActionExecutionPayloadResponse;
