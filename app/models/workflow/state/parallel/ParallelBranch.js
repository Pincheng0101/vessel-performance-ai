import { StateDefinitionFactory } from '~/models/workflow/state';

class ParallelBranch {
  constructor({
    startAt,
    states = [],
  } = {}) {
    this.startAt = startAt;
    this.states = states;
  }

  static toAsl(definition) {
    return {
      StartAt: definition.startAt,
      States: definition.states.reduce((acc, state) => {
        acc[state.name] = StateDefinitionFactory.toAsl(state)[state.name];
        return acc;
      }, {}),
    };
  }

  static createFromAsl(asl) {
    return new ParallelBranch({
      startAt: asl.StartAt,
      states: Object.entries(asl.States).map(([name, state]) => StateDefinitionFactory.createFromAsl(name, state)),
    });
  }
}

export default ParallelBranch;
