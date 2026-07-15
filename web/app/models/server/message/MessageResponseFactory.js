import * as ChatConstant from '~/constants/ChatConstant';
import AssistantMessageResponse from './AssistantMessageResponse';
import MessageResponse from './MessageResponse';
import UserMessageResponse from './UserMessageResponse';

class MessageResponseFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.role) {
      case ChatConstant.MessageRole.ASSISTANT:
        return new AssistantMessageResponse(payload);
      case ChatConstant.MessageRole.USER:
        return new UserMessageResponse(payload);
      default:
        return new MessageResponse(payload);
    }
  }
}

export default MessageResponseFactory;
