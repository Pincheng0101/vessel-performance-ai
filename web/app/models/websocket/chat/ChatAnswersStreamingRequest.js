import { StreamingConstant } from '~/constants';
import { QAPair } from './askUserQuestion';

/**
 * This class prepares a WebSocket request and converts parameters to snake_case.
 */
class ChatAnswersStreamingRequest {
  action = StreamingConstant.Action.CHAT.value;

  constructor({
    answers,
  }) {
    this.answers = answers;
  }

  /**
   * @param {ChatAnswersStreamingRequest} payload
   */
  static toRequestPayload(payload) {
    return {
      action: payload.action,
      message: {
        message_type: StreamingConstant.MessageType.ANSWERS.value,
        answers: payload.answers.map(QAPair.toRequestPayload),
      },
    };
  }
}

export default ChatAnswersStreamingRequest;
