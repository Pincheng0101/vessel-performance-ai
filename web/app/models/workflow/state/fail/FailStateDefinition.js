import { StateConstant } from '~/constants';
import { StateDefinition } from '~/models/workflow/state';

class FailStateDefinition extends StateDefinition {
  type = StateConstant.Type.FAIL.value;

  constructor({
    cause,
    causePath,
    comment,
    error,
    errorPath,
    name,
  } = {}) {
    super({
      name,
      comment,
    });
    this.cause = cause;
    this.causePath = causePath;
    this.error = error;
    this.errorPath = errorPath;
  }

  /**
   * @param {FailStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Comment: stateDefinition.comment,
        Error: stateDefinition.error,
        ErrorPath: stateDefinition.errorPath,
        Cause: stateDefinition.cause,
        CausePath: stateDefinition.causePath,
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new FailStateDefinition({
      name,
      comment: definition.Comment,
      error: definition.Error,
      errorPath: definition.ErrorPath,
      cause: definition.Cause,
      causePath: definition.CausePath,
    });
  }
}

export default FailStateDefinition;
