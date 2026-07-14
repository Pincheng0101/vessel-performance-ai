import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class StartWorkflowExecutionDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    execution_arn,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.START_WORKFLOW_EXECUTION.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.execution_arn = execution_arn ?? '';
  }
}

export default StartWorkflowExecutionDefaultOutput;
