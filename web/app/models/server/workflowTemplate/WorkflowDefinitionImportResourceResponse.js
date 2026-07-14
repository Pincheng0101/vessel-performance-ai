/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowDefinitionImportResourceResponse {
  constructor({
    resource_id,
    resource_type,
    resource_name,
  } = {}) {
    this.resourceId = resource_id;
    this.resourceType = resource_type;
    this.resourceName = resource_name;
  }
}

export default WorkflowDefinitionImportResourceResponse;
