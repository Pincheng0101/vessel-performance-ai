import { StreamingConstant } from '~/constants';
import { MessageResponseFactory } from '~/models/server/message';
import ChatStreamingResponse from './ChatStreamingResponse';
import { AskUserQuestionPayload } from './askUserQuestion';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatEndStreamingResponse extends ChatStreamingResponse {
  constructor({
    agent_id,
    ask_user_question_payload,
    execution_id,
    messages,
    session_id,
    source,
    stop_reason,
    timestamp,
    username,
  } = {}) {
    super({
      action: StreamingConstant.Action.CHAT.value,
      agent_id,
      response_type: StreamingConstant.ResponseType.END.value,
      session_id,
      source,
      timestamp,
      username,
    });
    this.executionId = execution_id;
    this.messages = Array.isArray(messages) ? messages.map(MessageResponseFactory.create) : messages;
    this.stopReason = stop_reason ?? StreamingConstant.StopReason.END_TURN.value;
    this.askUserQuestionPayload = ask_user_question_payload ? new AskUserQuestionPayload(ask_user_question_payload) : null;
  }

  get isAskUser() {
    return this.stopReason === StreamingConstant.StopReason.ASK_USER.value;
  }
}

export default ChatEndStreamingResponse;
