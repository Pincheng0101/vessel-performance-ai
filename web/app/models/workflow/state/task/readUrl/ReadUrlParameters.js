import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import ReadUrlPayload from './ReadUrlPayload';

class ReadUrlParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {ReadUrlPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new ReadUrlPayload(payload);
  }
}

export default ReadUrlParameters;
