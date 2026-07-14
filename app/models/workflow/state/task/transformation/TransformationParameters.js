import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import TransformationPayload from './TransformationPayload';

class TransformationParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {TransformationPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new TransformationPayload(payload);
  }
}

export default TransformationParameters;
