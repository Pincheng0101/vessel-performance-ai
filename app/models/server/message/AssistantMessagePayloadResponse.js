import AssistantMessagePayload from './AssistantMessagePayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AssistantMessagePayloadResponse extends AssistantMessagePayload {
  constructor({
    native_message,
  } = {}) {
    super({
      nativeMessage: native_message,
    });
  }
}

export default AssistantMessagePayloadResponse;
