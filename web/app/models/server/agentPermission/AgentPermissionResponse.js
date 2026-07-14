import AgentPermission from './AgentPermission';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentPermissionResponse extends AgentPermission {
  constructor({
    group_name,
    permission,
    updated_ts,
    agent_id,
    agent_name,
  } = {}) {
    super({
      groupName: group_name,
      permission,
      updatedTs: updated_ts,
      agentId: agent_id,
      agentName: agent_name,
    });
  }
}

export default AgentPermissionResponse;
