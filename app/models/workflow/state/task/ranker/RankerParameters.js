import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import RankerPayload from './RankerPayload';

class RankerParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {RankerPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new RankerPayload(payload);
  }
}

export default RankerParameters;
