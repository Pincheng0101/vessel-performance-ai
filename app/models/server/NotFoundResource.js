class NotFoundResource {
  constructor({
    resourceId,
    resourceType,
  } = {}) {
    this.resourceId = resourceId;
    this.resourceType = resourceType;
  }

  get id() {
    return this.resourceId;
  }

  get type() {
    return this.resourceType;
  }
}

export default NotFoundResource;
