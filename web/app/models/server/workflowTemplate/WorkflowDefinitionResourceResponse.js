import WorkflowDefinitionResource from './WorkflowDefinitionResource';
import WorkflowDefinitionResourceReferenceResponseFactory from './WorkflowDefinitionResourceReferenceResponseFactory';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionResourceResponse extends WorkflowDefinitionResource {
  constructor({
    create_request,
    description,
    references,
    resource_type,
  } = {}) {
    super({
      createRequest: create_request,
      description,
      references: {},
      resourceType: resource_type,
    });
    this.references = Object.fromEntries(
      Object.entries(references).map(([key, value]) => [key, WorkflowDefinitionResourceReferenceResponseFactory.create(value)]),
    );
  }
}

export default WorkflowDefinitionResourceResponse;
