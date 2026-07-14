import { ResourceConstant } from '~/constants';
import Permission from '~/models/server/Permission';

class WorkflowPermission extends Permission {
  constructor({
    grantDependencyPermissions,
    groupName,
    permission,
    skipOnDuplicate,
    updatedTs,
    workflowId,
    workflowName,
  } = {}) {
    super({
      grantDependencyPermissions,
      groupName,
      permission,
      skipOnDuplicate,
      updatedTs,
    });
    this.workflowId = workflowId;
    this.workflowName = workflowName;
  }

  get id() {
    return this.workflowId;
  }

  get name() {
    return this.workflowName;
  }

  get type() {
    return ResourceConstant.Type.WORKFLOW.value;
  }

  /**
   * @param {WorkflowPermission} resource
   */
  static toRequestPayload(resource) {
    return {
      ...Permission.toRequestPayload(resource),
      workflow_id: resource.workflowId,
    };
  }
}

export default WorkflowPermission;
