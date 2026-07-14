import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import StartSyncWorkflowExecutionPayload from './StartSyncWorkflowExecutionPayload';

class StartSyncWorkflowExecutionParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {StartSyncWorkflowExecutionPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new StartSyncWorkflowExecutionPayload(payload);
  }
}

export default StartSyncWorkflowExecutionParameters;
