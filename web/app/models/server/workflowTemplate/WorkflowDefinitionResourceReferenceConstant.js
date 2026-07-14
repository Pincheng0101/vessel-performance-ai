class WorkflowDefinitionResourceReferenceConstant {
  constructor({
    key,
    referenceType,
  } = {}) {
    this.key = key;
    this.referenceType = referenceType;
  }

  /**
   * @param {WorkflowDefinitionResourceReferenceConstant} reference
   */
  static toRequestPayload(reference) {
    return {
      key: reference.key,
      reference_type: reference.referenceType,
    };
  }
}

export default WorkflowDefinitionResourceReferenceConstant;
