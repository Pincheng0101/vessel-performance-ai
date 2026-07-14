import { LlmConstant } from '~/constants';
import { ContentBlockFactory } from '~/models/server/contentBlock';
import Message from './Message';

class UserMessage extends Message {
  constructor({
    content,
  }) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockFactory.create) : content,
      role: LlmConstant.MessageRole.USER.value,
    });
  }
}

export default UserMessage;
