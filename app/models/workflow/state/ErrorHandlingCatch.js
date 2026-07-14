class ErrorHandlingCatch {
  constructor({
    comment,
    errorEquals,
    id,
    next,
    resultPath,
  } = {}) {
    this.comment = comment;
    this.errorEquals = errorEquals;
    this.id = id;
    this.next = next;
    this.resultPath = resultPath || null;
  }

  /**
   * @param {ErrorHandlingCatch} catchItem
   */
  static toAsl(catchItem) {
    return objUtils.omit({
      Comment: catchItem.comment,
      ErrorEquals: catchItem.errorEquals,
      Next: catchItem.next,
      ResultPath: catchItem.resultPath,
    });
  }

  /**
   * @param {Object} definition
   */
  static createFromAsl(definition) {
    return new ErrorHandlingCatch({
      comment: definition.Comment,
      errorEquals: definition.ErrorEquals,
      id: strUtils.uuid(),
      next: definition.Next,
      resultPath: definition.ResultPath,
    });
  }
}

export default ErrorHandlingCatch;
