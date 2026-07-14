class CreateResourcePermission {
  constructor({
    groupName,
    data = {},
    updatedTs,
  } = {}) {
    this.groupName = groupName;
    this.data = data;
    this.updatedTs = updatedTs;
  }

  /**
   * @param {CreateResourcePermission} permission
   */
  static toRequestPayload(permission) {
    return {
      group_name: permission.groupName,
      data: permission.data || {},
    };
  }
}

export default CreateResourcePermission;
