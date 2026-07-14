import { ChatConstant, StreamingConstant } from '~/constants';
import { Message } from '~/models/server/message';

class ChatRoomMessage extends Message {
  constructor({
    content,
    id,
    thinkingSteps,
    role,
    status,
  }) {
    super({
      content: content ?? [],
      role,
    });
    this.id = id ?? strUtils.uuid();
    this.thinkingSteps = thinkingSteps ?? [];
    this.status = status;
    this.error = null;
    this.thinkingEndedAt = null;
  }

  get isRoleAssistant() {
    return this.role === ChatConstant.MessageRole.ASSISTANT;
  }

  get isRoleUser() {
    return this.role === ChatConstant.MessageRole.USER;
  }

  get isStatusAborted() {
    return this.status === ChatConstant.MessageStatus.ABORTED;
  }

  get isStatusCompleted() {
    return this.status === ChatConstant.MessageStatus.COMPLETED;
  }

  get isStatusComposing() {
    return this.status === ChatConstant.MessageStatus.COMPOSING;
  }

  get isStatusFailed() {
    return this.status === ChatConstant.MessageStatus.FAILED;
  }

  get isStatusPending() {
    return this.status === ChatConstant.MessageStatus.PENDING;
  }

  get hasLongContent() {
    return this.content.map(item => item.text).join('\n').length > 100;
  }

  get hasMarkdownStructure() {
    const text = this.content.map(item => item.text).join('\n');
    return strUtils.hasMarkdownStructure(text);
  }

  get isLikelyFinalAnswer() {
    return this.hasLongContent
      || this.hasMarkdownStructure
      || this.isStatusCompleted
      || this.isStatusFailed
      || this.isStatusAborted;
  }

  get latestContentBlock() {
    return this.content[this.content.length - 1];
  }

  setContentBlock(value) {
    this.content = value;
    return this;
  }

  pushContentBlock(value) {
    if (!value.startedAt) {
      value.startedAt = Date.now();
    }
    this.content.push(value);
    this.markThinkingEndedIfFinalAnswer();
    return this;
  }

  getThinkingBlockEndedAt(block) {
    if (!block?.startedAt) return null;
    const blocks = [...this.thinkingSteps, ...this.content];
    const index = blocks.indexOf(block);
    if (index === -1) return null;
    for (let i = index + 1; i < blocks.length; i++) {
      const next = blocks[i];
      if (next.contentBlockName === StreamingConstant.ContentBlock.THINKING.name) {
        return next.startedAt ?? null;
      }
    }
    return this.thinkingEndedAt;
  }

  setLatestContentBlockText(value) {
    if (this.latestContentBlock) {
      this.latestContentBlock.text = value;
    }
    this.markThinkingEndedIfFinalAnswer();
    return this;
  }

  appendLatestContentBlockText(value) {
    if (this.latestContentBlock) {
      this.latestContentBlock.text += value;
    }
    this.markThinkingEndedIfFinalAnswer();
    return this;
  }

  appendLatestContentBlockToolResults(value) {
    if (!this.latestContentBlock || !value) return this;
    this.latestContentBlock.toolResults = {
      ...(this.latestContentBlock.toolResults || {}),
      ...value,
    };
    return this;
  }

  pushThinkingStep(value) {
    this.thinkingSteps.push(value);
    return this;
  }

  downgradeContentToThinkingSteps() {
    if (this.content.length < 1) return this;
    for (const contentBlock of this.content) {
      this.pushThinkingStep(contentBlock);
    }
    this.setContentBlock([]);
    return this;
  }

  resetToPending() {
    this.thinkingEndedAt = null;
    this.setStatus(ChatConstant.MessageStatus.PENDING);
    this.setContentBlock([]);
    this.thinkingSteps = [];
    this.setError(null);
    return this;
  }

  setStatus(value) {
    this.status = value;
    this.markThinkingEndedIfFinalAnswer();
    return this;
  }

  setError(value) {
    this.error = value;
    return this;
  }

  markThinkingEndedIfFinalAnswer() {
    if (!this.thinkingEndedAt && this.isLikelyFinalAnswer) {
      this.thinkingEndedAt = Date.now();
    }
  }
}

export default ChatRoomMessage;
