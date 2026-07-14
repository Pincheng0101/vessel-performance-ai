import { ChatConstant } from '~/constants';
import ChatRoomMessage from './ChatRoomMessage';

class AssistantChatRoomMessage extends ChatRoomMessage {
  constructor({
    askUserQuestionPayload,
    content,
    id,
    status,
    thinkingSteps,
  } = {}) {
    super({
      content,
      id,
      role: ChatConstant.MessageRole.ASSISTANT,
      status,
      thinkingSteps,
    });
    this.askUserQuestionPayload = askUserQuestionPayload ?? null;
    this.askUserQuestionSubmitted = false;
    this.widget = null;
  }

  setAskUserQuestionPayload(value) {
    this.askUserQuestionPayload = value;
    return this;
  }

  setAskUserQuestionSubmitted(value) {
    this.askUserQuestionSubmitted = value;
    return this;
  }

  setWidget(value) {
    this.widget = value
      ? { component: markRaw(value.component), props: value.props ?? {} }
      : null;
    return this;
  }

  resetToPending() {
    super.resetToPending();
    this.setWidget(null);
    return this;
  }
}

export default AssistantChatRoomMessage;
