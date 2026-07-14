import AgentPermissionResponse from './AgentPermissionResponse';

/**
 * @import { AgentPermissionResponse } from '~/models/server/agentPermission'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentPermissionListResponse {
  /**
   * @type {AgentPermissionResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.agent_permissions.map(item => new AgentPermissionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default AgentPermissionListResponse;
