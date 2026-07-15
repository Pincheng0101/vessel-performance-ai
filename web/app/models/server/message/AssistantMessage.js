import * as ChatConstant from '~/constants/ChatConstant';
import { ContentBlockFactory } from '~/models/server/contentBlock';
import AssistantMessagePayload from './AssistantMessagePayload';
import Message from './Message';

class AssistantMessage extends Message {
  constructor({
    content,
    payload,
  }) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockFactory.create) : content,
      payload: payload ? new AssistantMessagePayload(payload) : payload,
      role: ChatConstant.MessageRole.ASSISTANT,
    });
  }
}

export default AssistantMessage;
