import ChoiceStateDefinition from './ChoiceStateDefinition';

class ChoiceNodeData {
  constructor({
    executionStatus,
    isFormGroupValid = true,
    stateDefinition,
  } = {}) {
    this.executionStatus = executionStatus;
    this.isFormGroupValid = isFormGroupValid;
    this.stateDefinition = new ChoiceStateDefinition(stateDefinition);
  }
}

export default ChoiceNodeData;
