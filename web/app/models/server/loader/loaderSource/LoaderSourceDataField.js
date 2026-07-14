class LoaderSourceDataField {
  constructor({
    srcField,
    destField,
  } = {}) {
    this.srcField = srcField;
    this.destField = destField;
  }

  /**
   * @param {LoaderSourceDataField} resource
   */
  static toRequestPayload(resource) {
    return {
      src_field: resource.srcField,
      dest_field: resource?.destField,
    };
  }
}

export default LoaderSourceDataField;
