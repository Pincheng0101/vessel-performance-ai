import * as LlmConstant from '~/constants/LlmConstant';
import AssistantMessage from './AssistantMessage';
import Message from './Message';
import UserMessage from './UserMessage';

class MessageFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.role) {
      case LlmConstant.MessageRole.ASSISTANT.value:
        return new AssistantMessage(payload);
      case LlmConstant.MessageRole.USER.value:
        return new UserMessage(payload);
      default:
        return new Message(payload);
    }
  }
}

export default MessageFactory;
