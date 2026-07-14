import WorkflowDefinition from './WorkflowDefinition';

class WorkflowDefinitionToImport {
  constructor({
    workflowDefinition,
    dryRun,
    fallback,
  } = {}) {
    this.workflowDefinition = workflowDefinition ? new WorkflowDefinition(workflowDefinition) : null;
    this.dryRun = dryRun;
    this.fallback = fallback;
  }

  /**
   * @param {WorkflowDefinitionToImport} definition
   */
  static toRequestPayload(definition) {
    return {
      workflow_definition: WorkflowDefinition.toRequestPayload(definition.workflowDefinition),
      dry_run: definition.dryRun,
      fallback: definition.fallback,
    };
  }
}

export default WorkflowDefinitionToImport;
