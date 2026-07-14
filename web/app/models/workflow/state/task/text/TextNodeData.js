import TextStateDefinition from './TextStateDefinition';

class TextNodeData {
  /**
   * @param {Object} params
   * @param {TextStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new TextStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default TextNodeData;
