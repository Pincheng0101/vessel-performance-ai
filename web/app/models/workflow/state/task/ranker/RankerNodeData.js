import RankerStateDefinition from './RankerStateDefinition';

class RankerNodeData {
  /**
   * @param {Object} params
   * @param {RankerStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new RankerStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default RankerNodeData;
