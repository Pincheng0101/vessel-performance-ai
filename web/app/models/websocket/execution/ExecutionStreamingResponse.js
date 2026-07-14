import { StreamingConstant } from '~/constants';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionStreamingResponse {
  action = StreamingConstant.Action.EXECUTION.value;

  constructor({
    action,
    error,
    response_type,
    timestamp,
  } = {}) {
    this.action = action;
    this.error = error;
    this.responseType = response_type;
    this.timestamp = timestamp || Date.now();
  }

  get id() {
    return this.timestamp;
  }
}

export default ExecutionStreamingResponse;
