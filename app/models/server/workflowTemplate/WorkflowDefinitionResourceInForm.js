import WorkflowDefinitionResourceReferenceFactory from './WorkflowDefinitionResourceReferenceFactory';

class WorkflowDefinitionResourceInForm {
  constructor({
    createRequest,
    description,
    id,
    isReferenceTypeResource,
    references,
    resourceType,
  } = {}) {
    this.createRequest = createRequest;
    this.description = description;
    this.id = id;
    this.isReferenceTypeResource = isReferenceTypeResource;
    this.references = Object.fromEntries(
      Object.entries(references).map(([key, value]) => [key, WorkflowDefinitionResourceReferenceFactory.create(value)]),
    );
    this.resourceType = resourceType;
  }
}

export default WorkflowDefinitionResourceInForm;
