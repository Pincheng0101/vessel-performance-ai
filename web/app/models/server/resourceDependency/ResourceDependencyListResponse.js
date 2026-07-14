import ResourceDependencyResponse from './ResourceDependencyResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourceDependencyListResponse {
  constructor({
    resource_id,
    dependencies,
    dependents,
  }) {
    this.resourceId = resource_id;
    this.dependencies = Object.values(dependencies).flat().map(item => new ResourceDependencyResponse(item));
    this.dependents = Object.values(dependents).flat().map(item => new ResourceDependencyResponse(item));
  }
}

export default ResourceDependencyListResponse;
