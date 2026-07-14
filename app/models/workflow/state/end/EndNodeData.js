class EndNodeData {
  constructor({
    branchIndex,
    outputSchema,
    isFormGroupValid = true,
  } = {}) {
    this.branchIndex = branchIndex;
    this.outputSchema = outputSchema;
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default EndNodeData;
