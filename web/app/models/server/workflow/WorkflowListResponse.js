import WorkflowResponse from './WorkflowResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowListResponse {
  /**
   * @type {WorkflowResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.workflows.map(item => new WorkflowResponse(item));
    this.nextToken = response.next_token;
  }
}

export default WorkflowListResponse;
