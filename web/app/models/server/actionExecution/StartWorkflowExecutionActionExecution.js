import StartWorkflowExecutionPayload from '~/models/workflow/state/task/startWorkflowExecution/StartWorkflowExecutionPayload';
import ActionExecution from './ActionExecution';

class StartWorkflowExecutionActionExecution extends ActionExecution {
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
   * @param {StartWorkflowExecutionPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: StartWorkflowExecutionPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default StartWorkflowExecutionActionExecution;
