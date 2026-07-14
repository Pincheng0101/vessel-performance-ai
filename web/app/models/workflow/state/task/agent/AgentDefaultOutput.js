import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class AgentDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    message,
    response,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.AGENT.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.message = message ?? '';
    this.response = response ?? {};
  }
}

export default AgentDefaultOutput;
