import WorkflowPermission from './WorkflowPermission';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowPermissionResponse extends WorkflowPermission {
  constructor({
    group_name,
    permission,
    updated_ts,
    workflow_id,
    workflow_name,
  } = {}) {
    super({
      groupName: group_name,
      permission,
      updatedTs: updated_ts,
      workflowId: workflow_id,
      workflowName: workflow_name,
    });
  }
}

export default WorkflowPermissionResponse;
