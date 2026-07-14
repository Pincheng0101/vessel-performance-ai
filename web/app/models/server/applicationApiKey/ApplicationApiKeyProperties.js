class ApplicationApiKeyProperties {
  constructor({
    description,
    groups,
  } = {}) {
    this.description = description ?? null;
    this.groups = groups ?? [];
  }

  static toRequestPayload(resource) {
    return {
      description: resource.description,
      groups: resource.groups,
    };
  }
}

export default ApplicationApiKeyProperties;
