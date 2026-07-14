class WorkflowDraftValue {
  constructor({
    definition,
    edges, // Remove edges when all workflow draft has definition
    inputSchema,
    nodes, // Remove nodes when all workflow draft has definition
    outputSchema,
    stateMemoryInputSelector,
    updatedTs,
    useExternalMemoryInput,
  } = {}) {
    this.definition = definition;
    this.edges = edges;
    this.inputSchema = inputSchema;
    this.nodes = nodes;
    this.outputSchema = outputSchema;
    this.stateMemoryInputSelector = stateMemoryInputSelector;
    this.updatedTs = updatedTs;
    this.useExternalMemoryInput = useExternalMemoryInput;
  }
}

export default WorkflowDraftValue;
