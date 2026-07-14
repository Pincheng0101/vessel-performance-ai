import { LlmConstant } from '~/constants';
import AssistantMessageResponse from './AssistantMessageResponse';
import MessageResponse from './MessageResponse';
import UserMessageResponse from './UserMessageResponse';

class MessageResponseFactory {
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.role) {
      case LlmConstant.MessageRole.ASSISTANT.value:
        return new AssistantMessageResponse(payload);
      case LlmConstant.MessageRole.USER.value:
        return new UserMessageResponse(payload);
      default:
        return new MessageResponse(payload);
    }
  }
}

export default MessageResponseFactory;
