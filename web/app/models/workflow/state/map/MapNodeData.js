import MapStateDefinition from './MapStateDefinition';

class MapNodeData {
  /**
   * @param {Object} params
   * @param {MapStateDefinition} params.stateDefinition
   */
  constructor({
    executionStatus,
    isCollapsed = false,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isCollapsed = isCollapsed;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new MapStateDefinition(stateDefinition);
  }
}

export default MapNodeData;
