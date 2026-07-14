import WorkflowDefinition from './WorkflowDefinition';
import WorkflowDefinitionConstantResponse from './WorkflowDefinitionConstantResponse';
import WorkflowDefinitionResourceResponse from './WorkflowDefinitionResourceResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionResponse extends WorkflowDefinition {
  constructor({
    workflow_definition_name,
    constants,
    resources,
    version,
  } = {}) {
    super({
      workflowDefinitionName: workflow_definition_name,
      constants: {},
      resources: {},
      version,
    });
    this.constants = Object.fromEntries(
      Object.entries(constants || {}).map(
        ([key, value]) => [key, new WorkflowDefinitionConstantResponse(value)],
      ),
    );
    this.resources = Object.fromEntries(
      Object.entries(resources || {}).map(
        ([key, value]) => [key, new WorkflowDefinitionResourceResponse(value)],
      ),
    );
  }

  /**
   *
   * @param {WorkflowDefinitionResponse} v
   * @returns {boolean}
   */
  static isValid(v) {
    return v && v.workflowDefinitionName;
  }
}

export default WorkflowDefinitionResponse;
