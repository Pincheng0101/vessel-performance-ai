import RetrievalPayload from '~/models/workflow/state/task/retrieval/RetrievalPayload';
import ActionExecution from './ActionExecution';

class RetrievalActionExecution extends ActionExecution {
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
   * @param {RetrievalPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: RetrievalPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default RetrievalActionExecution;
