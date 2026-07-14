class CommonPrefix {
  constructor({
    commonPrefix,
  } = {}) {
    // Set fields explicitly to prevent backend default values
    this.commonPrefix = commonPrefix ?? '';
  }

  get id() {
    return this.commonPrefix;
  }

  get name() {
    return pathUtils.extractLast(this.commonPrefix);
  }
}

export default CommonPrefix;
