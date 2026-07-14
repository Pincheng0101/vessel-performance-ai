import WorkflowDefinitionToExportResource from './WorkflowDefinitionToExportResource';

class WorkflowDefinitionToExport {
  constructor({
    resources,
    workflowDefinitionName,
  } = {}) {
    this.resources = resources ? resources.map(resource => new WorkflowDefinitionToExportResource(resource)) : [];
    this.workflowDefinitionName = workflowDefinitionName;
  }

  /**
   * @param {WorkflowDefinitionToExport} definition
   */
  static toRequestPayload(definition) {
    return {
      resources: definition.resources.map(resource => WorkflowDefinitionToExportResource.toRequestPayload(resource)),
      workflow_definition_name: definition.workflowDefinitionName,
    };
  }
}

export default WorkflowDefinitionToExport;
