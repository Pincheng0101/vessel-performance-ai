import ActionExecution from './ActionExecution';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ActionExecutionResponse extends ActionExecution {
  constructor({
    action_output,
    cause,
    error,
    execution_arn,
    start_ts,
    status,
    stop_ts,
  } = {}) {
    super({
      actionOutput: action_output,
      cause,
      error,
      executionArn: execution_arn,
      startTs: start_ts,
      status,
      stopTs: stop_ts,
    });
  }
}

export default ActionExecutionResponse;
