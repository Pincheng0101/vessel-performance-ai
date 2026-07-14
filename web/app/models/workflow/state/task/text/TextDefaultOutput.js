import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class TextDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    text,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.TEXT.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.text = text ?? '';
  }
}

export default TextDefaultOutput;
