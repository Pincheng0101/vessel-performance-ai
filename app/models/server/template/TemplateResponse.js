import Template from './Template';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TemplateResponse extends Template {
  constructor({
    status,
    system_info,
    template_id,
    template_name,
    template,
    updated_ts,
  } = {}) {
    super({
      status,
      systemInfo: system_info,
      template,
      templateId: template_id,
      templateName: template_name,
      updatedTs: updated_ts,
    });
  }
}

export default TemplateResponse;
