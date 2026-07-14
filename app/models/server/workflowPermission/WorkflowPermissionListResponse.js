import WorkflowPermissionResponse from './WorkflowPermissionResponse';

/**
 * @import { WorkflowPermissionResponse } from '~/models/server/workflowPermission'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowPermissionListResponse {
  /**
   * @type {WorkflowPermissionResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.workflow_permissions.map(item => new WorkflowPermissionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default WorkflowPermissionListResponse;
