import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import RetrievalPayload from './RetrievalPayload';

class RetrievalParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {RetrievalPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new RetrievalPayload(payload);
  }
}

export default RetrievalParameters;
