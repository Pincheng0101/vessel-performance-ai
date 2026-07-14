import WorkflowDefinitionConstant from './WorkflowDefinitionConstant';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionConstantResponse extends WorkflowDefinitionConstant {
  constructor({
    description,
    dtype,
    value,
  } = {}) {
    super({
      description,
      dtype,
      value,
    });
  }
}

export default WorkflowDefinitionConstantResponse;
