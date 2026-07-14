import ChatSession from './ChatSession';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatSessionListResponse {
  /**
   * @type {ChatSession[]}
   */
  data = [];

  constructor(response) {
    this.data = response.chat_sessions.map(item => new ChatSession({
      agentId: item.agent_id,
      username: item.username,
      sessionId: item.session_id,
      sessionName: item.session_name,
      lastMessageTs: item.last_message_ts,
      createdTs: item.created_ts,
      storageId: item.storage_id,
    }));
    this.nextToken = response.next_token;
  }
}

export default ChatSessionListResponse;
