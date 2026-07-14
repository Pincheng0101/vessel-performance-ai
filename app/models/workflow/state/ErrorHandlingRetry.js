class ErrorHandlingRetry {
  constructor({
    backoffRate,
    comment,
    errorEquals,
    id,
    intervalSeconds,
    jitterStrategy,
    maxAttempts,
    maxDelaySeconds,
  } = {}) {
    this.backoffRate = backoffRate;
    this.comment = comment;
    this.errorEquals = errorEquals;
    this.id = id;
    this.intervalSeconds = intervalSeconds;
    this.jitterStrategy = jitterStrategy;
    this.maxAttempts = maxAttempts;
    this.maxDelaySeconds = maxDelaySeconds;
  }

  /**
   * @param {ErrorHandlingRetry} retryItem
   */
  static toAsl(retryItem) {
    return objUtils.omit({
      BackoffRate: retryItem.backoffRate,
      Comment: retryItem.comment,
      ErrorEquals: retryItem.errorEquals,
      IntervalSeconds: retryItem.intervalSeconds,
      JitterStrategy: retryItem.jitterStrategy,
      MaxAttempts: retryItem.maxAttempts,
      MaxDelaySeconds: retryItem.maxDelaySeconds,
    });
  }

  /**
   * @param {Object} definition
   */
  static createFromAsl(definition) {
    return new ErrorHandlingRetry({
      backoffRate: definition.BackoffRate,
      comment: definition.Comment,
      errorEquals: definition.ErrorEquals,
      id: strUtils.uuid(),
      intervalSeconds: definition.IntervalSeconds,
      jitterStrategy: definition.JitterStrategy,
      maxAttempts: definition.MaxAttempts,
      maxDelaySeconds: definition.MaxDelaySeconds,
    });
  }
}

export default ErrorHandlingRetry;
