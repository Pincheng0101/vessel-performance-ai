import WorkflowDefinitionResourceReferenceFactory from './WorkflowDefinitionResourceReferenceFactory';

class WorkflowDefinitionResource {
  constructor({
    createRequest,
    description,
    references,
    resourceType,
  } = {}) {
    this.createRequest = createRequest;
    this.description = description;
    this.references = Object.fromEntries(
      Object.entries(references).map(([key, value]) => [key, WorkflowDefinitionResourceReferenceFactory.create(value)]),
    );
    this.resourceType = resourceType;
  }

  /**
   * @param {WorkflowDefinitionResource} resource
   */
  static toRequestPayload(resource) {
    return {
      create_request: resource.createRequest,
      description: resource.description,
      references: Object.fromEntries(
        Object.entries(resource.references).map(([key, value]) => {
          return [key, WorkflowDefinitionResourceReferenceFactory.toRequestPayload(value)];
        }),
      ),
      resource_type: resource.resourceType,
    };
  }
}

export default WorkflowDefinitionResource;
