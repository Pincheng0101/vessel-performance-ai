import { StreamingConstant } from '~/constants';

/**
 * This class prepares a WebSocket request and converts parameters to snake_case.
 */
class ExecutionStreamingRequest {
  action = StreamingConstant.Action.EXECUTION.value;

  constructor({
    executionArn,
    lastTimestamp,
  }) {
    this.executionArn = executionArn;
    this.lastTimestamp = lastTimestamp;
  }

  /**
   * @param {ExecutionStreamingRequest} payload
   */
  static toRequestPayload(payload) {
    return {
      action: payload.action,
      execution_arn: payload.executionArn,
      last_timestamp: payload.lastTimestamp,
    };
  }
}

export default ExecutionStreamingRequest;
