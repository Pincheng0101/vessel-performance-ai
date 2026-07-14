import ResourceDependencyDeleteFailedResponse from './ResourceDependencyDeleteFailedResponse';
import ResourceDependencyDeleteSuccessResponse from './ResourceDependencyDeleteSuccessResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourceDependencyDeleteResponse {
  constructor({
    status,
    success,
    failed,
  }) {
    this.status = status;
    this.success = success.map(item => new ResourceDependencyDeleteSuccessResponse(item));
    this.failed = failed.map(item => new ResourceDependencyDeleteFailedResponse(item));
  }
}

export default ResourceDependencyDeleteResponse;
