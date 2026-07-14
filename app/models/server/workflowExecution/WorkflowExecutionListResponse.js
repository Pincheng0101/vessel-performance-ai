import WorkflowExecutionResponse from './WorkflowExecutionResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowExecutionListResponse {
  /**
   * @type {WorkflowExecutionResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.executions.map(item => new WorkflowExecutionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default WorkflowExecutionListResponse;
