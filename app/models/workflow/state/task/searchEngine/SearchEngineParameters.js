import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import SearchEnginePayload from './SearchEnginePayload';

class SearchEngineParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {SearchEnginePayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new SearchEnginePayload(payload);
  }
}

export default SearchEngineParameters;
