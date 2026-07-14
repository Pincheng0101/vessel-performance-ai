import { ContentBlockActionExecutionPayloadResponseFactory } from '~/models/server/contentBlock';
import MessageActionExecutionPayload from './MessageActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MessageActionExecutionPayloadResponse extends MessageActionExecutionPayload {
  constructor({
    content,
    role,
  } = {}) {
    super({
      content: (() => {
        if (!content) return content;
        if (jsonPathUtils.isJsonPath(content)) return content;
        if (objUtils.isObject(content)) return content;
        if (!Array.isArray(content)) return [];
        return content.map(ContentBlockActionExecutionPayloadResponseFactory.create);
      })(),
      role,
    });
  }
}

export default MessageActionExecutionPayloadResponse;
