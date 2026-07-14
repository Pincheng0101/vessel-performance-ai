import Resource from './Resource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourceDependencyResponse extends Resource {
  constructor({
    resource_id,
    resource_name,
    resource_subtype,
    resource_type,
  }) {
    super({
      resourceId: resource_id,
      resourceName: resource_name,
      resourceType: resource_type,
    });
    this.resourceSubtype = resource_subtype;
  }

  get subtype() {
    return this.resourceSubtype;
  }
}

export default ResourceDependencyResponse;
