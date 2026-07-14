import { StateConstant } from '~/constants';
import { ChoiceStateDefinition } from '~/models/workflow/state/choice';
import { FailStateDefinition } from '~/models/workflow/state/fail';
import { MapStateDefinition } from '~/models/workflow/state/map';
import { ParallelStateDefinition } from '~/models/workflow/state/parallel';
import { PassStateDefinition } from '~/models/workflow/state/pass';
import { SucceedStateDefinition } from '~/models/workflow/state/succeed';
import { TaskStateDefinition } from '~/models/workflow/state/task';
import { WaitStateDefinition } from '~/models/workflow/state/wait';

class StateDefinitionFactory {
  static toAsl(stateDefinition) {
    switch (stateDefinition.type) {
      case StateConstant.Type.TASK.value:
        return TaskStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.CHOICE.value:
        return ChoiceStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.MAP.value:
        return MapStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.PARALLEL.value:
        return ParallelStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.PASS.value:
        return PassStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.WAIT.value:
        return WaitStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.SUCCEED.value:
        return SucceedStateDefinition.toAsl(stateDefinition);
      case StateConstant.Type.FAIL.value:
        return FailStateDefinition.toAsl(stateDefinition);
      default:
        return null;
    }
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    switch (definition.Type) {
      case StateConstant.Type.TASK.value:
        return TaskStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.CHOICE.value:
        return ChoiceStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.MAP.value:
        return MapStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.PARALLEL.value:
        return ParallelStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.PASS.value:
        return PassStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.WAIT.value:
        return WaitStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.SUCCEED.value:
        return SucceedStateDefinition.createFromAsl(name, definition);
      case StateConstant.Type.FAIL.value:
        return FailStateDefinition.createFromAsl(name, definition);
      default:
        return null;
    }
  }
}

export default StateDefinitionFactory;
