import WorkflowCronExecutionResponse from './WorkflowCronExecutionResponse';

/**
 * @import { WorkflowCronExecutionResponse } from '~/models/server/workflowCron'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowCronExecutionListResponse {
  /**
   * @type {WorkflowCronExecutionResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.executions.map(item => new WorkflowCronExecutionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default WorkflowCronExecutionListResponse;
