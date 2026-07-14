import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import RetrieverPayload from './RetrieverPayload';

class RetrieverParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {RetrieverPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new RetrieverPayload(payload);
  }
}

export default RetrieverParameters;
