class WorkflowDefinitionConstant {
  constructor({
    description,
    dtype,
    value,
  } = {}) {
    this.description = description;
    this.dtype = dtype;
    this.value = value;
  }

  /**
   * @param {WorkflowDefinitionConstant} constant
   */
  static toRequestPayload(constant) {
    return {
      description: constant.description,
      dtype: constant.dtype,
      value: constant.value,
    };
  }
}

export default WorkflowDefinitionConstant;
