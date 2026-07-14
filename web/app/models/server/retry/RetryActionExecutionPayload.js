import { ActionExecutionConstant } from '~/constants';

class RetryActionExecutionPayload {
  constructor({
    attempts,
    temperatureDiff,
  } = {}) {
    this.attempts = attempts;
    this.temperatureDiff = temperatureDiff;
  }

  /**
   * @param {RetryActionExecutionPayload | boolean} retry
   */
  static toRequestPayload(retry) {
    if (retry === undefined || retry === null || typeof retry === 'boolean') {
      return retry
        ? {
            attempts: ActionExecutionConstant.RetryParams.ATTEMPTS.default,
            temperature_diff: ActionExecutionConstant.RetryParams.TEMPERATURE_DIFF.default,
          }
        : null;
    }
    return {
      attempts: retry.attempts,
      temperature_diff: retry.temperatureDiff,
    };
  }
}

export default RetryActionExecutionPayload;
