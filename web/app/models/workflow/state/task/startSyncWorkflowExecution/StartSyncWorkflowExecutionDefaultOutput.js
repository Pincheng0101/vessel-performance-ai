import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class StartSyncWorkflowExecutionDefaultOutput extends DefaultOutput {
  constructor({
    cause,
    error,
    errors,
    output,
    status,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.cause = cause ?? '';
    this.error = error ?? '';
    this.output = output ?? {};
    this.status = status ?? '';
  }
}

export default StartSyncWorkflowExecutionDefaultOutput;
