/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionImportFailedResponse {
  constructor({
    error_message,
    resource_type,
  } = {}) {
    this.errorMessage = error_message;
    this.resourceType = resource_type;
  }
}

export default WorkflowDefinitionImportFailedResponse;
