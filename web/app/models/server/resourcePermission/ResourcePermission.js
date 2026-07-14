import Permission from '~/models/server/Permission';

class ResourcePermission extends Permission {
  constructor({
    grantDependencyPermissions,
    groupName,
    permission,
    resourceId,
    resourceName,
    resourceType,
    skipOnDuplicate,
    updatedTs,
  } = {}) {
    super({
      grantDependencyPermissions,
      groupName,
      permission,
      skipOnDuplicate,
      updatedTs,
    });
    this.resourceId = resourceId;
    this.resourceName = resourceName;
    this.resourceType = resourceType;
  }

  get id() {
    return this.resourceId;
  }

  get name() {
    return this.resourceName;
  }

  get type() {
    return this.resourceType;
  }

  /**
   * @param {ResourcePermission} resource
   */
  static toRequestPayload(resource) {
    return {
      ...Permission.toRequestPayload(resource),
      resource_id: resource.resourceId,
      resource_type: resource.resourceType,
    };
  }
}

export default ResourcePermission;
