import WorkflowTemplateResponse from './WorkflowTemplateResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowTemplateListResponse {
  /**
   * @type {WorkflowTemplateResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = (response.workflow_templates ?? []).map(item => new WorkflowTemplateResponse(item));
    this.nextToken = response.next_token;
  }
}

export default WorkflowTemplateListResponse;
