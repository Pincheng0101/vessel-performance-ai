import TransformationStateDefinition from './TransformationStateDefinition';

class TransformationNodeData {
  /**
   * @param {Object} params
   * @param {TransformationStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new TransformationStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default TransformationNodeData;
