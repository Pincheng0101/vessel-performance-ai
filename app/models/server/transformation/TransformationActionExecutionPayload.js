class TransformationActionExecutionPayload {
  constructor({
    transformationType,
    input,
  } = {}) {
    this.transformationType = transformationType;
    this.input = input;
  }

  /**
   * @param {TransformationActionExecutionPayload} transformation
   */
  static toRequestPayload(transformation) {
    return {
      transformation_type: transformation.transformationType,
      input: transformation.input,
    };
  }
}

export default TransformationActionExecutionPayload;
