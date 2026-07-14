class Permission {
  constructor({
    grantDependencyPermissions,
    groupName,
    permission,
    skipOnDuplicate,
    updatedTs,
  } = {}) {
    this.grantDependencyPermissions = grantDependencyPermissions;
    this.groupName = groupName;
    this.permission = permission;
    this.skipOnDuplicate = skipOnDuplicate;
    this.updatedTs = updatedTs;
  }

  /**
   * @param {Permission} resource
   */
  static toRequestPayload(resource) {
    return {
      grant_dependency_permissions: resource.grantDependencyPermissions,
      group_name: resource.groupName,
      permission: resource.permission,
      skip_on_duplicate: resource.skipOnDuplicate,
    };
  }
}

export default Permission;
