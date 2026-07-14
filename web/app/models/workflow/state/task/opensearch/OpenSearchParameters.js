import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import OpenSearchPayload from './OpenSearchPayload';

class OpenSearchParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {OpenSearchPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new OpenSearchPayload(payload);
  }
}

export default OpenSearchParameters;
