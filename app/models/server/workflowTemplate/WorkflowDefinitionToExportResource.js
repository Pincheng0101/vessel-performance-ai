class WorkflowDefinitionToExportResource {
  constructor({
    resourceId,
    resourceType,
  } = {}) {
    this.resourceId = resourceId;
    this.resourceType = resourceType;
  }

  /**
   * @param {WorkflowDefinitionToExportResource} resource
   */
  static toRequestPayload(resource) {
    return {
      resource_id: resource.resourceId,
      resource_type: resource.resourceType,
    };
  }
}

export default WorkflowDefinitionToExportResource;
