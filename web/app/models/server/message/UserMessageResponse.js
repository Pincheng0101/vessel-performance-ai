import { ContentBlockResponseFactory } from '~//models/server/contentBlock';
import UserMessage from './UserMessage';

class UserMessageResponse extends UserMessage {
  constructor({
    content,
  } = {}) {
    super({
      content: Array.isArray(content) ? content.map(ContentBlockResponseFactory.create) : content,
    });
  }
}

export default UserMessageResponse;
