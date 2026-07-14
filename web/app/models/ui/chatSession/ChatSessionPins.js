class ChatSessionPins {
  constructor({
    sessionIds,
  } = {}) {
    this.sessionIds = sessionIds ?? [];
  }

  static getUiDataKey(agentId, userId) {
    return `chat-session-pins-${agentId}-user-${userId}`;
  }
}

export default ChatSessionPins;
