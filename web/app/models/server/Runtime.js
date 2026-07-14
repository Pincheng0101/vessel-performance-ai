class Runtime {
  constructor({
    status,
    updatedTs,
  } = {}) {
    this.status = status;
    this.updatedTs = updatedTs;
  }

  /**
   * @abstract
   */
  get displayFields() {
    return [];
  }

  /**
   * @abstract
   */
  static toRequestPayload() { }
}

export default Runtime;
