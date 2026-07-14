import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import MySqlPayload from './MySqlPayload';

class MySqlParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {MySqlPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new MySqlPayload(payload);
  }
}

export default MySqlParameters;
