import RetryActionExecutionPayload from './RetryActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RetryActionExecutionPayloadResponse extends RetryActionExecutionPayload {
  constructor({
    attempts,
    temperature_diff,
  } = {}) {
    super({
      attempts,
      temperatureDiff: temperature_diff,
    });
  }
}

export default RetryActionExecutionPayloadResponse;
