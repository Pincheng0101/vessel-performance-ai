import WorkflowDefinitionResourceReferenceConstant from './WorkflowDefinitionResourceReferenceConstant';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionResourceReferenceConstantResponse extends WorkflowDefinitionResourceReferenceConstant {
  constructor({
    key,
    reference_type,
  } = {}) {
    super({
      key,
      referenceType: reference_type,
    });
  }
}

export default WorkflowDefinitionResourceReferenceConstantResponse;
