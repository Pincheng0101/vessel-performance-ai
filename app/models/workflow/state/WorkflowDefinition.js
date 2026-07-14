import { StateConstant } from '~/constants';
import StateDefinitionFactory from './StateDefinitionFactory';

class WorkflowDefinition {
  constructor({
    comment,
    startAt,
    states,
  } = {}) {
    this.comment = comment;
    this.startAt = startAt;
    this.states = states;
  }

  static toAsl(definition) {
    return {
      Comment: definition.comment,
      StartAt: definition.startAt,
      States: definition.states.reduce((acc, state) => {
        acc[state.name] = StateDefinitionFactory.toAsl(state)[state.name];
        return acc;
      }, {}),
    };
  }

  static createFromAsl(asl) {
    return new WorkflowDefinition({
      comment: asl.Comment,
      startAt: asl.StartAt,
      states: Object.entries(asl.States).map(([name, definition]) => StateDefinitionFactory.createFromAsl(name, definition)),
    });
  }

  get actionTypes() {
    const paths = [
      'parameters.payload.actionType',
    ];
    const validTypes = Object.values(StateConstant.ActionType).map(type => type.value);
    return arrUtils
      .collectValues(this.states, paths)
      .filter(type => validTypes.includes(type));
  }
}

export default WorkflowDefinition;
