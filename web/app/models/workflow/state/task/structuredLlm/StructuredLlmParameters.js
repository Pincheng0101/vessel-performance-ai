import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import StructuredLlmPayload from './StructuredLlmPayload';

class StructuredLlmParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {StructuredLlmPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new StructuredLlmPayload(payload);
  }
}

export default StructuredLlmParameters;
