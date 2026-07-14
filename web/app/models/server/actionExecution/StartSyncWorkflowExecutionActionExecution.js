import StartSyncWorkflowExecutionPayload from '~/models/workflow/state/task/startSyncWorkflowExecution/StartSyncWorkflowExecutionPayload';
import ActionExecution from './ActionExecution';

class StartSyncWorkflowExecutionActionExecution extends ActionExecution {
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
   * @param {StartSyncWorkflowExecutionPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: StartSyncWorkflowExecutionPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default StartSyncWorkflowExecutionActionExecution;
