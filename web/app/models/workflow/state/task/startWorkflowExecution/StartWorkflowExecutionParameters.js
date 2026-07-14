import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import StartWorkflowExecutionPayload from './StartWorkflowExecutionPayload';

class StartWorkflowExecutionParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {StartWorkflowExecutionPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new StartWorkflowExecutionPayload(payload);
  }
}

export default StartWorkflowExecutionParameters;
