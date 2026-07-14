import { StreamingConstant } from '~/constants';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionEndStreamingResponse extends ExecutionStreamingResponse {
  constructor({
    response,
    timestamp,
  } = {}) {
    super({
      response_type: StreamingConstant.ResponseType.END.value,
      timestamp,
    });
    this.response = response;
  }
}

export default ExecutionEndStreamingResponse;
