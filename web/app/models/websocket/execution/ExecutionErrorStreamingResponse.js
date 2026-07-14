import { StreamingConstant } from '~/constants';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionErrorStreamingResponse extends ExecutionStreamingResponse {
  constructor({
    error,
    status_code,
  } = {}) {
    super({
      error,
      response_type: StreamingConstant.ResponseType.ERROR.value,
    });
    this.statusCode = status_code;
  }
}

export default ExecutionErrorStreamingResponse;
