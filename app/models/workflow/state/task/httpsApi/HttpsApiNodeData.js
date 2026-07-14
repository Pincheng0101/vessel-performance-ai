import HttpsApiStateDefinition from './HttpsApiStateDefinition';

class HttpsApiNodeData {
  /**
   * @param {Object} params
   * @param {HttpsApiStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new HttpsApiStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default HttpsApiNodeData;
