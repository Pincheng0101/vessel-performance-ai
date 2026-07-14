import DependentResource from './DependentResource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DependentResourceResponse extends DependentResource {
  constructor({
    resource_id,
    resource_type,
  } = {}) {
    super({
      resourceId: resource_id,
      resourceType: resource_type,
    });
  }
}

export default DependentResourceResponse;
