import TransformationPayload from '~/models/workflow/state/task/transformation/TransformationPayload';
import ActionExecution from './ActionExecution';

class TransformationActionExecution extends ActionExecution {
  constructor({
    actionOutput,
    cause,
    error,
    executionArn,
    startTs,
    status,
    stopTs,
  } = {}) {
    super({
      actionOutput,
      cause,
      error,
      executionArn,
      startTs,
      status,
      stopTs,
    });
  }

  /**
   * @param {Object} params
   * @param {TransformationPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: TransformationPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default TransformationActionExecution;
