import * as ChatConstant from '~/constants/ChatConstant';
import AssistantMessage from './AssistantMessage';
import Message from './Message';
import UserMessage from './UserMessage';

class MessageFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.role) {
      case ChatConstant.MessageRole.ASSISTANT:
        return new AssistantMessage(payload);
      case ChatConstant.MessageRole.USER:
        return new UserMessage(payload);
      default:
        return new Message(payload);
    }
  }
}

export default MessageFactory;
