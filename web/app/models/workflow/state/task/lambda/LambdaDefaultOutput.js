import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class LambdaDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    output,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.LAMBDA.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.output = output ?? {};
  }
}

export default LambdaDefaultOutput;
