import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class AthenaDefaultOutput extends DefaultOutput {
  constructor({
    columns,
    errors,
    query_execution_id,
    rows,
    truncated,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.ATHENA.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.columns = columns ?? [];
    this.rows = rows ?? [];
    this.query_execution_id = query_execution_id ?? '';
    this.truncated = truncated ?? false;
  }
}

export default AthenaDefaultOutput;
