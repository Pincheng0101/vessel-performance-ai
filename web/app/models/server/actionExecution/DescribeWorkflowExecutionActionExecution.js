import DescribeWorkflowExecutionPayload from '~/models/workflow/state/task/describeWorkflowExecution/DescribeWorkflowExecutionPayload';
import ActionExecution from './ActionExecution';

class DescribeWorkflowExecutionActionExecution extends ActionExecution {
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
   * @param {DescribeWorkflowExecutionPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: DescribeWorkflowExecutionPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default DescribeWorkflowExecutionActionExecution;
