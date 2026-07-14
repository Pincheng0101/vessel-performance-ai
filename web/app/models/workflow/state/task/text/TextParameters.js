import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import TextPayload from './TextPayload';

class TextParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {TextPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new TextPayload(payload);
  }
}

export default TextParameters;
