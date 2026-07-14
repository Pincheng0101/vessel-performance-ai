import ReadUrlStateDefinition from './ReadUrlStateDefinition';

class ReadUrlNodeData {
  /**
   * @param {Object} params
   * @param {ReadUrlStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new ReadUrlStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default ReadUrlNodeData;
