import Resource from './Resource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourceDependencyDeleteFailedResponse extends Resource {
  constructor({
    error_message,
    resource_id,
    resource_name,
    resource_type,
  }) {
    super({
      resourceId: resource_id,
      resourceName: resource_name,
      resourceType: resource_type,
    });
    this.errorMessage = error_message;
  }
}

export default ResourceDependencyDeleteFailedResponse;
