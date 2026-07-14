import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class OpenSearchDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    response,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.OPENSEARCH.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.response = response ?? {};
  }
}

export default OpenSearchDefaultOutput;
