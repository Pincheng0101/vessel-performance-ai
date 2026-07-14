import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class CodeDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    output,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.CODE.value,
      errors,
    });
    this.output = output ?? {};
  }
}

export default CodeDefaultOutput;
