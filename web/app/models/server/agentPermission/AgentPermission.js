import { ResourceConstant } from '~/constants';
import Permission from '~/models/server/Permission';

class AgentPermission extends Permission {
  constructor({
    agentId,
    agentName,
    grantDependencyPermissions,
    groupName,
    permission,
    skipOnDuplicate,
    updatedTs,
  } = {}) {
    super({
      grantDependencyPermissions,
      groupName,
      permission,
      skipOnDuplicate,
      updatedTs,
    });
    this.agentId = agentId;
    this.agentName = agentName;
  }

  get id() {
    return this.agentId;
  }

  get name() {
    return this.agentName;
  }

  get type() {
    return ResourceConstant.Type.AGENT.value;
  }

  /**
   * @param {AgentPermission} resource
   */
  static toRequestPayload(resource) {
    return {
      ...Permission.toRequestPayload(resource),
      agent_id: resource.agentId,
    };
  }
}

export default AgentPermission;
