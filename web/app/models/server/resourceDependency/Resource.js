class Resource {
  constructor({
    resourceId,
    resourceType,
    resourceName,
  }) {
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.resourceName = resourceName;
  }

  get id() {
    return this.resourceId;
  }

  get type() {
    return this.resourceType;
  }

  get name() {
    return this.resourceName;
  }

  /**
   * @param {Resource} resource
   */
  static toRequestPayload(Resource) {
    return {
      resource_id: Resource.resourceId,
      resource_type: Resource.resourceType,
    };
  }
}

export default Resource;
