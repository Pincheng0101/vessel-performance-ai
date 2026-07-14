import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class McpDefaultOutput extends DefaultOutput {
  constructor({
    response,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.MCP.value,
    });
    // Provide default values to ensure the expected structure
    this.response = response ?? {};
  }
}

export default McpDefaultOutput;
