import ToolResultsRetrievalResponse from '~/models/websocket/chat/event/ToolResultsRetrievalResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ChatSessionMessagesResponse {
  /**
   * @type {Object[]}
   */
  data = [];

  constructor(response) {
    this.data = (response.messages ?? []).map(group => ({
      pairs: group.pairs,
      toolResults: group.tool_results
        ? { retrieval: group.tool_results.retrieval?.map(item => new ToolResultsRetrievalResponse(item)) }
        : null,
      timestamp: group.timestamp,
    }));
    this.nextToken = response.next_token;
  }
}

export default ChatSessionMessagesResponse;
