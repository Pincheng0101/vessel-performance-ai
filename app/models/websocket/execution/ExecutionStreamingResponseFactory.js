import { ResponseType } from '~/constants/StreamingConstant';
import ExecutionDataStreamingResponse from './ExecutionDataStreamingResponse';
import ExecutionEndStreamingResponse from './ExecutionEndStreamingResponse';
import ExecutionErrorStreamingResponse from './ExecutionErrorStreamingResponse';
import ExecutionStartStreamingResponse from './ExecutionStartStreamingResponse';
import ExecutionStreamingResponse from './ExecutionStreamingResponse';
import ExecutionTimeoutStreamingResponse from './ExecutionTimeoutStreamingResponse';

class ExecutionStreamingResponseFactory {
  static create(data) {
    switch (data.response_type) {
      case ResponseType.START.value:
        return new ExecutionStartStreamingResponse(data);
      case ResponseType.DATA.value:
        return new ExecutionDataStreamingResponse(data);
      case ResponseType.END.value:
        return new ExecutionEndStreamingResponse(data);
      case ResponseType.ERROR.value:
        return new ExecutionErrorStreamingResponse(data);
      case ResponseType.TIMEOUT.value:
        return new ExecutionTimeoutStreamingResponse(data);
      default:
        return new ExecutionStreamingResponse(data);
    }
  }
}

export default ExecutionStreamingResponseFactory;
