import WorkflowCronResponse from './WorkflowCronResponse';

/**
 * @import { WorkflowCronResponse } from '~/models/server/workflowCron'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowCronListResponse {
  /**
   * @type {WorkflowCronResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.workflow_crons.map(item => new WorkflowCronResponse(item));
    this.nextToken = response.next_token;
    this.outputFields = response.output_fields;
  }
}

export default WorkflowCronListResponse;
