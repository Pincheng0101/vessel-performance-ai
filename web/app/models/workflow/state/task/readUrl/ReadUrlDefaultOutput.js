import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class ReadUrlDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    read_url_output,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.READ_URL.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.read_url_output = read_url_output ?? '';
  }
}

export default ReadUrlDefaultOutput;
