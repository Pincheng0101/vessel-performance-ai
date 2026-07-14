import { StreamingConstant } from '~/constants';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExecutionDataStreamingResponse extends ExecutionStreamingResponse {
  constructor({
    action_id,
    action_type,
    name,
    output,
    timestamp,
  } = {}) {
    super({
      response_type: StreamingConstant.ResponseType.DATA.value,
      timestamp,
    });
    this.actionId = action_id;
    this.actionType = action_type;
    this.name = name;
    this.output = output;
  }
}

export default ExecutionDataStreamingResponse;
