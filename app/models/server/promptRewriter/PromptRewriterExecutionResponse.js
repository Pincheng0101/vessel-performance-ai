/**
 * This class receives data from the API with parameters in snake_case.
 */

class PromptRewriterExecutionResponse {
  constructor({
    cause,
    error,
    execution_arn,
    output,
    start_ts,
    status,
    stop_ts,
  } = {}) {
    this.cause = cause;
    this.error = error;
    this.executionArn = execution_arn;
    this.output = output;
    this.startTs = start_ts;
    this.status = status;
    this.stopTs = stop_ts;
  }
}

export default PromptRewriterExecutionResponse;
