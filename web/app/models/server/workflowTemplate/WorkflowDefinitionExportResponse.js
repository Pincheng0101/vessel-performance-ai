import WorkflowDefinitionResponse from './WorkflowDefinitionResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionExportResponse {
  constructor({
    workflow_definition,
  } = {}) {
    this.workflowDefinition = workflow_definition ? new WorkflowDefinitionResponse(workflow_definition) : null;
    this.workflowDefinitionRaw = workflow_definition; // Keep the raw data with snake_case keys for download and import
  }
}

export default WorkflowDefinitionExportResponse;
