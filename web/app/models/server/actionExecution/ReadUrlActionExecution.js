import ReadUrlPayload from '~/models/workflow/state/task/readUrl/ReadUrlPayload';
import ActionExecution from './ActionExecution';

class ReadUrlActionExecution extends ActionExecution {
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
   * @param {ReadUrlPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: ReadUrlPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default ReadUrlActionExecution;
