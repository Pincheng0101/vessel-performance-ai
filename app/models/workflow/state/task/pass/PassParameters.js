import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import PassPayload from './PassPayload';

class PassParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {PassPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new PassPayload(payload);
  }
}

export default PassParameters;
