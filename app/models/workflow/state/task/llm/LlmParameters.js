import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import LlmPayload from './LlmPayload';

class LlmParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {LlmPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new LlmPayload(payload);
  }
}

export default LlmParameters;
