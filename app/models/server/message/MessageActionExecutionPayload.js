import { ContentBlockActionExecutionPayloadFactory } from '~/models/server/contentBlock';
import Message from './Message';

class MessageActionExecutionPayload extends Message {
  constructor({
    content,
    role,
  } = {}) {
    super({
      content: (() => {
        if (!content) return null;
        if (jsonPathUtils.isJsonPath(content)) return content;
        if (objUtils.isObject(content)) return content;
        if (!Array.isArray(content)) return [];
        return content.map(ContentBlockActionExecutionPayloadFactory.create);
      })(),
      role,
    });
  }

  /**
   * @param {MessageActionExecutionPayload} message
   */
  static toRequestPayload(message) {
    return {
      content: (() => {
        if (!message.content) return null;
        if (jsonPathUtils.isJsonPath(message.content)) return message.content;
        if (objUtils.isObject(message.content)) return message.content;
        if (!Array.isArray(message.content)) return [];
        return message.content.map(ContentBlockActionExecutionPayloadFactory.toRequestPayload);
      })(),
      role: message.role,
    };
  }
}

export default MessageActionExecutionPayload;
