import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import LambdaPayload from './LambdaPayload';

class LambdaParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {LambdaPayload} params.payload
   */
  constructor({
    payload,
  } = {}) {
    super();
    this.payload = new LambdaPayload(payload);
  }
}

export default LambdaParameters;
