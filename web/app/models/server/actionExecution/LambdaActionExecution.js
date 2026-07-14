import LambdaPayload from '~/models/workflow/state/task/lambda/LambdaPayload';
import ActionExecutionResponse from './ActionExecutionResponse';

class LambdaActionExecution extends ActionExecutionResponse {
  constructor({
    actionOutput,
    executionArn,
    status,
  } = {}) {
    super({
      actionOutput,
      executionArn,
      status,
    });
  }

  /**
   * @param {Object} params
   * @param {LambdaPayload} params.actionPayload
   * @param {Object} params.input
   */
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: LambdaPayload.toRequestPayload(actionPayload),
      input,
      external_memory_input: externalMemoryInput,
    });
  }
}

export default LambdaActionExecution;
