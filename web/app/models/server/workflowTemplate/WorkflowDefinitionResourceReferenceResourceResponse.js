import WorkflowDefinitionResourceReferenceResource from './WorkflowDefinitionResourceReferenceResource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionResourceReferenceResourceResponse extends WorkflowDefinitionResourceReferenceResource {
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

export default WorkflowDefinitionResourceReferenceResourceResponse;
