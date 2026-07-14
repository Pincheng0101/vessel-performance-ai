import SearchEngineStateDefinition from './SearchEngineStateDefinition';

class SearchEngineNodeData {
  /**
   * @param {Object} params
   * @param {SearchEngineStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new SearchEngineStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default SearchEngineNodeData;
