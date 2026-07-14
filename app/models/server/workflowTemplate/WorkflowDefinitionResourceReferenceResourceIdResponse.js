import WorkflowDefinitionResourceReferenceResourceId from './WorkflowDefinitionResourceReferenceResourceId';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionResourceReferenceResourceIdResponse extends WorkflowDefinitionResourceReferenceResourceId {
  constructor({
    key,
    reference_type,
    resource_type,
  } = {}) {
    super({
      key,
      referenceType: reference_type,
      resourceType: resource_type,
    });
  }
}

export default WorkflowDefinitionResourceReferenceResourceIdResponse;
