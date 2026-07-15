import * as ChatConstant from '~/constants/ChatConstant';
import { ContentBlockFactory } from '~/models/server/contentBlock';
import Message from './Message';

class UserMessage extends Message {
  constructor({
    content,
  }) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockFactory.create) : content,
      role: ChatConstant.MessageRole.USER,
    });
  }
}

export default UserMessage;
