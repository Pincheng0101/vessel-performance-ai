import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class RankerDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    docs,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.RANKER.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.docs = docs ?? [];
  }
}

export default RankerDefaultOutput;
