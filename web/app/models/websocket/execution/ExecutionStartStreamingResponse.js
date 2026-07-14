import { StreamingConstant } from '~/constants';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionStartStreamingResponse extends ExecutionStreamingResponse {
  constructor({
    execution_arn,
    timestamp,
  } = {}) {
    super({
      response_type: StreamingConstant.ResponseType.START.value,
      timestamp,
    });
    this.executionArn = execution_arn;
  }
}

export default ExecutionStartStreamingResponse;
