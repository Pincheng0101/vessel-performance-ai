import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import HttpsApiPayload from './HttpsApiPayload';

class HttpsApiParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {HttpsApiPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new HttpsApiPayload(payload);
  }
}

export default HttpsApiParameters;
