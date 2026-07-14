import { ContentBlockFactory } from '~/models/server/contentBlock';

class Message {
  constructor({
    content,
    role,
  }) {
    this.content = content;
    this.role = role;
  }

  /**
   * @param {Message} message
   */
  static toRequestPayload(message) {
    return {
      content: message.content.map(ContentBlockFactory.toRequestPayload),
      role: message.role,
    };
  }
}

export default Message;
