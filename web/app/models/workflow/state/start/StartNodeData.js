class StartNodeData {
  constructor({
    inputSchema,
    isFormGroupValid = true,
    startAt = '',
    stateMemoryInputSelector = null,
    useExternalMemoryInput = false,
  } = {}) {
    this.startAt = startAt;
    this.inputSchema = inputSchema;
    this.isFormGroupValid = isFormGroupValid;
    this.stateMemoryInputSelector = stateMemoryInputSelector;
    this.useExternalMemoryInput = useExternalMemoryInput;
  }
}

export default StartNodeData;
