import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class HttpsApiDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    output,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.HTTPS_API.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.output = output ?? {};
  }
}

export default HttpsApiDefaultOutput;
