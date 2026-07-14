import WorkflowExecutionEvent from './WorkflowExecutionEvent';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowExecutionHistoryResponse {
  /**
   * @type {WorkflowExecutionEvent[]}
   */
  data = [];

  constructor(response) {
    this.data = response.history.events.map(event => new WorkflowExecutionEvent(event));
    this.nextToken = response.history.next_token;
  }
}

export default WorkflowExecutionHistoryResponse;
