/**
 * This class receives data from the API with parameters in snake_case.
 */
class CodeActionCopilotResponse {
  constructor({
    execution_arn,
    session_id,
  } = {}) {
    this.executionArn = execution_arn;
    this.sessionId = session_id;
  }
}

export default CodeActionCopilotResponse;
