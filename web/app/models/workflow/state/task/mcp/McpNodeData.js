import McpStateDefinition from './McpStateDefinition';

class McpNodeData {
  /**
   * @param {Object} params
   * @param {McpStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new McpStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default McpNodeData;
