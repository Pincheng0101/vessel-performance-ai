class WorkflowDefinitionResourceReferenceResourceId {
  constructor({
    id,
    referenceType,
    resourceType,
  } = {}) {
    this.id = id;
    this.referenceType = referenceType;
    this.resourceType = resourceType;
  }

  /**
   * @param {WorkflowDefinitionResourceReferenceResourceId} reference
   */
  static toRequestPayload(reference) {
    return {
      id: reference.id,
      reference_type: reference.referenceType,
      resource_type: reference.resourceType,
    };
  }
}

export default WorkflowDefinitionResourceReferenceResourceId;
