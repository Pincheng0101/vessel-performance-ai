import { ContentBlockResponseFactory } from '~/models/server/contentBlock';
import AssistantMessage from './AssistantMessage';
import AssistantMessagePayloadResponse from './AssistantMessagePayloadResponse';

class AssistantMessageResponse extends AssistantMessage {
  constructor({
    content,
    payload,
  } = {}) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockResponseFactory.create) : content,
      payload: payload ? new AssistantMessagePayloadResponse(payload) : payload,
    });
  }
}

export default AssistantMessageResponse;
