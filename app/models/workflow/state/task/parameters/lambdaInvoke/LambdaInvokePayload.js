class LambdaInvokePayload {
  /**
   * @param {Object} params
   * @param {String} params.actionType
   */
  constructor({
    actionType,
  } = {}) {
    this.actionType = actionType;
  }

  static createFromAsl(asl) {
    return new LambdaInvokePayload({
      actionType: asl.action_type,
    });
  }
}

export default LambdaInvokePayload;
