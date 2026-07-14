import ChatStreamingEventResponse from './ChatStreamingEventResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ErrorEventResponse extends ChatStreamingEventResponse {
  constructor({
    error,
    event_type,
  } = {}) {
    super({
      event_type,
    });
    this.error = error;
  }
}

export default ErrorEventResponse;
