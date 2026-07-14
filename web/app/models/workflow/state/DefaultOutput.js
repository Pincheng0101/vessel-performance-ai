/**
 * This class receives data from the user input with parameters in snake_case.
 */
class DefaultOutput {
  constructor({
    action_type,
    errors,
  }) {
    this.action_type = action_type;
    this.errors = errors ?? [];
  }

  removeActionType() {
    delete this.action_type;
    return this;
  }
}

export default DefaultOutput;
