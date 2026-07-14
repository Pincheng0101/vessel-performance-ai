import WorkflowDefinitionResponse from './WorkflowDefinitionResponse';
import WorkflowTemplate from './WorkflowTemplate';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowTemplateResponse extends WorkflowTemplate {
  constructor({
    workflow_definition = null,
    workflow_template_id,
    workflow_template_name,
    description,
    status,
    system_info = null,
    tags,
    updated_ts,
  } = {}) {
    super({
      workflowDefinition: workflow_definition ? new WorkflowDefinitionResponse(workflow_definition) : null,
      workflowTemplateId: workflow_template_id,
      workflowTemplateName: workflow_template_name,
      description,
      status,
      tags,
    });
    this.systemInfo = system_info;
    this.updatedTs = updated_ts;
  }

  get id() {
    return this.workflowTemplateId;
  }

  get name() {
    return this.workflowTemplateName;
  }
}

export default WorkflowTemplateResponse;
