import MySqlStateDefinition from './MySqlStateDefinition';

class MySqlNodeData {
  /**
   * @param {Object} params
   * @param {MySqlStateDefinition} params.stateDefinition
   */
  constructor({
    stateDefinition,
    isFormGroupValid = true,
  } = {}) {
    this.stateDefinition = new MySqlStateDefinition(stateDefinition);
    this.isFormGroupValid = isFormGroupValid;
  }
}

export default MySqlNodeData;
