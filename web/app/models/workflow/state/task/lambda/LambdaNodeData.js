import LambdaStateDefinition from './LambdaStateDefinition';

class LambdaNodeData {
  /**
   * @param {Object} params
   * @param {LambdaStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new LambdaStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default LambdaNodeData;
