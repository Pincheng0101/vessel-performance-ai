import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import McpPayload from './McpPayload';

class McpParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {McpPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new McpPayload(payload);
  }
}

export default McpParameters;
