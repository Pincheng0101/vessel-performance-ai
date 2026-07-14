import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import AgentPayload from './AgentPayload';

class AgentParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {AgentPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new AgentPayload(payload);
  }
}

export default AgentParameters;
