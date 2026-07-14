import CodeStateDefinition from './CodeStateDefinition';

class CodeNodeData {
  /**
   * @param {Object} params
   * @param {CodeStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new CodeStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default CodeNodeData;
