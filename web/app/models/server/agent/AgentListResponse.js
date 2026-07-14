import AgentResponse from './AgentResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentListResponse {
  /**
   * @type {AgentResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.agents.map(item => new AgentResponse(item));
    this.nextToken = response.next_token;
  }
}

export default AgentListResponse;
