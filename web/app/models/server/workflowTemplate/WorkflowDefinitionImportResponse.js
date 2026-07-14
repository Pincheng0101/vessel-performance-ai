import WorkflowDefinitionImportFailedResponse from './WorkflowDefinitionImportFailedResponse';
import WorkflowDefinitionImportResourceResponse from './WorkflowDefinitionImportResourceResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionImportResponse {
  constructor({
    failed,
    resources,
    status,
  } = {}) {
    this.failed = Object.fromEntries(
      Object.entries(failed || {}).map(
        ([key, value]) => [key, new WorkflowDefinitionImportFailedResponse(value)],
      ),
    );
    this.resources = Object.fromEntries(
      Object.entries(resources || {}).map(
        ([key, value]) => [key, new WorkflowDefinitionImportResourceResponse(value)],
      ),
    );
    this.status = status;
  }
}

export default WorkflowDefinitionImportResponse;
