import { WorkflowExecutionResponse } from '~/models/server/workflowExecution';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GetExecutionResponse {
  constructor({
    execution,
    response_url,
  } = {}) {
    this.execution = execution ? new WorkflowExecutionResponse(execution) : null;
    this.responseUrl = response_url;
  }
}

export default GetExecutionResponse;
