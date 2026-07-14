import WorkflowDefinitionConstant from './WorkflowDefinitionConstant';
import WorkflowDefinitionResource from './WorkflowDefinitionResource';

class WorkflowDefinition {
  constructor({
    workflowDefinitionName,
    constants,
    resources,
    version,
  } = {}) {
    this.workflowDefinitionName = workflowDefinitionName;
    this.constants = Object.fromEntries(
      Object.entries(constants).map(([key, value]) => [key, new WorkflowDefinitionConstant(value)]),
    );
    this.resources = Object.fromEntries(
      Object.entries(resources).map(([key, value]) => [key, new WorkflowDefinitionResource(value)]),
    );
    this.version = version;
  }

  /**
   * @param {WorkflowDefinition} definition
   */
  static toRequestPayload(definition) {
    return {
      workflow_definition_name: definition.workflowDefinitionName,
      constants: Object.fromEntries(
        Object.entries(definition.constants).map(([key, value]) => [key, WorkflowDefinitionConstant.toRequestPayload(value)]),
      ),
      resources: Object.fromEntries(
        Object.entries(definition.resources).map(([key, value]) => [key, WorkflowDefinitionResource.toRequestPayload(value)]),
      ),
      version: definition.version,
    };
  }
}

export default WorkflowDefinition;
