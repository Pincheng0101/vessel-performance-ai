import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import AthenaPayload from './AthenaPayload';

class AthenaParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {AthenaPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new AthenaPayload(payload);
  }
}

export default AthenaParameters;
