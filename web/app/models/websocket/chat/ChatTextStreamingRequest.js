import { StreamingConstant } from '~/constants';
import { ContentBlockFactory } from '~/models/server/contentBlock';

/**
 * This class prepares a WebSocket request and converts parameters to snake_case.
 */
class ChatTextStreamingRequest {
  action = StreamingConstant.Action.CHAT.value;

  constructor({
    content,
    llmId,
    maxIterations,
  }) {
    this.content = content;
    this.llmId = llmId;
    this.maxIterations = maxIterations;
  }

  /**
   * @param {ChatTextStreamingRequest} payload
   */
  static toRequestPayload(payload) {
    return {
      action: payload.action,
      llm_id: payload.llmId,
      max_iterations: payload.maxIterations,
      message: {
        message_type: StreamingConstant.MessageType.TEXT.value,
        content: payload.content.map(ContentBlockFactory.toRequestPayload),
      },
    };
  }
}

export default ChatTextStreamingRequest;
