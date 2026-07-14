class AgentResourceReference {
  constructor({
    description,
  } = {}) {
    this.description = description;
  }

  /**
   * @param {AgentResourceReference} resource
   */
  static toRequestPayload(resource) {
    return {
      description: resource.description,
    };
  }
}

export default AgentResourceReference;
