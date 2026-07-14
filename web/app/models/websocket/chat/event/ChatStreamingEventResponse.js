/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatStreamingEventResponse {
  constructor({
    event_type,
  } = {}) {
    this.eventType = event_type;
  }
}

export default ChatStreamingEventResponse;
