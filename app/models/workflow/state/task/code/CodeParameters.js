import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import CodePayload from './CodePayload';

class CodeParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {CodePayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new CodePayload(payload);
  }
}

export default CodeParameters;
