import ResourcePermission from './ResourcePermission';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourcePermissionResponse extends ResourcePermission {
  constructor({
    group_name,
    permission,
    resource_id,
    resource_name,
    resource_type,
    updated_ts,
  } = {}) {
    super({
      groupName: group_name,
      permission,
      resourceId: resource_id,
      resourceName: resource_name,
      resourceType: resource_type,
      updatedTs: updated_ts,
    });
  }
}

export default ResourcePermissionResponse;
