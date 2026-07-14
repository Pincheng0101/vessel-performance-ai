class ExternalMemory {
  constructor({
    presignedUrl,
    externalMemoryId,
  }) {
    this.presignedUrl = presignedUrl;
    this.externalMemoryId = externalMemoryId;
  }

  get id() {
    return this.externalMemoryId;
  }
}

export default ExternalMemory;
