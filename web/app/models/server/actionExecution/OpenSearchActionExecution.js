import OpenSearchPayload from '~/models/workflow/state/task/opensearch/OpenSearchPayload';
import ActionExecution from './ActionExecution';

class OpenSearchActionExecution extends ActionExecution {
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
   * @param {OpenSearchPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: OpenSearchPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default OpenSearchActionExecution;
