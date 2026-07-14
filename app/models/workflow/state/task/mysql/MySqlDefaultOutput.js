import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class MySqlDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    num_affected_rows,
    rows,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.MYSQL.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.num_affected_rows = num_affected_rows ?? 0;
    this.rows = rows ?? [];
  }
}

export default MySqlDefaultOutput;
