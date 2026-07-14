import ChoiceItemDefinition from './ChoiceItemDefinition';

class ChoiceItem {
  constructor({
    id,
    sourceHandle,
    isDefault = false,
    stateDefinition,
  } = {}) {
    this.id = id;
    this.sourceHandle = sourceHandle;
    this.isDefault = isDefault;
    this.stateDefinition = new ChoiceItemDefinition(stateDefinition);
  }

  static createFromAsl(asl, isDefault = false) {
    return new ChoiceItem({
      id: strUtils.uuid(),
      sourceHandle: strUtils.uuid(),
      isDefault,
      stateDefinition: ChoiceItemDefinition.createFromAsl(asl),
    });
  }
}

export default ChoiceItem;
