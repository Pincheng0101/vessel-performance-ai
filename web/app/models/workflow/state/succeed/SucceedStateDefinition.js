import { StateConstant } from '~/constants';
import { StateDefinition } from '~/models/workflow/state';

class SucceedStateDefinition extends StateDefinition {
  type = StateConstant.Type.SUCCEED.value;

  constructor({
    name,
    comment,
  } = {}) {
    super({
      name,
      comment,
    });
  }

  /**
   * @param {SucceedStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Comment: stateDefinition.comment,
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new SucceedStateDefinition({
      name,
      comment: definition.Comment,
    });
  }
}

export default SucceedStateDefinition;
