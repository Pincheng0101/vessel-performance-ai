import { ContentBlockResponseFactory } from '../contentBlock';
import Message from './Message';

class MessageResponse extends Message {
  constructor({
    content,
    role,
  } = {}) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockResponseFactory.create) : content,
      role,
    });
  }
}

export default MessageResponse;
