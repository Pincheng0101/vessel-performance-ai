class Resource {
  constructor({
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    this.status = status;
    this.systemInfo = systemInfo;
    this.updatedTs = updatedTs;
  }

  /**
   * @abstract
   */
  get resourceType() {
    return '';
  }

  /**
   * @abstract
   */
  get id() {
    return '';
  }

  /**
   * @abstract
   */
  get name() {
    return '';
  }

  /**
   * @abstract
   */
  get type() {
    return '';
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
  static toRequestPayload() {}
}

export default Resource;
