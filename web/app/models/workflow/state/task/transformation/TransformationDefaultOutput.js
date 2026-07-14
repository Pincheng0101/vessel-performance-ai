import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class TransformationDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    transformation_output,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.TRANSFORMATION.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.transformation_output = transformation_output ?? {};
  }
}

export default TransformationDefaultOutput;
