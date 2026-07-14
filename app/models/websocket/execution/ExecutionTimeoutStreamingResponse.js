import { StreamingConstant } from '~/constants';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionTimeoutStreamingResponse extends ExecutionStreamingResponse {
  constructor() {
    super({
      response_type: StreamingConstant.ResponseType.TIMEOUT.value,
    });
  }
}

export default ExecutionTimeoutStreamingResponse;
