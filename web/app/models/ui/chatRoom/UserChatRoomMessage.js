import * as ChatConstant from '~/constants/ChatConstant';
import ChatRoomMessage from './ChatRoomMessage';

class UserChatRoomMessage extends ChatRoomMessage {
  constructor({
    answers,
    content,
    id,
    status,
    thinkingSteps,
  } = {}) {
    super({
      content,
      id,
      thinkingSteps,
      role: ChatConstant.MessageRole.USER,
      status,
    });
    this.answers = answers ?? null;
  }
}

export default UserChatRoomMessage;
