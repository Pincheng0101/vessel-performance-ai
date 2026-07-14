import { Runtime } from '~/models/server';

class ChatSession extends Runtime {
  constructor({
    agentId,
    username,
    sessionId,
    sessionName,
    lastMessageTs,
    createdTs,
    storageId,
  } = {}) {
    super();
    this.agentId = agentId;
    this.username = username;
    this.sessionId = sessionId;
    this.sessionName = sessionName;
    this.lastMessageTs = lastMessageTs;
    this.createdTs = createdTs;
    this.storageId = storageId;
  }

  get id() {
    return this.sessionId;
  }

  get name() {
    return this.sessionName;
  }
}

export default ChatSession;
