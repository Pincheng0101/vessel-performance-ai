import { StateConstant } from '~/constants';
import { ActionExecutionFactory } from '~/models/server/actionExecution';
import LambdaInvokePayloadFactory from './LambdaInvokePayloadFactory';

class LambdaInvokeParameters {
  constructor({
    functionName,
    payload,
  } = {}) {
    this.functionName = functionName || StateConstant.Task.FUNCTION_NAME;
    this.payload = payload;
  }

  /**
   * @param {Object} parameters
   */
  static createFromAsl(parameters) {
    return {
      functionName: parameters.FunctionName,
      payload: LambdaInvokePayloadFactory.createFromAsl(parameters.Payload),
    };
  }

  /**
   * @param {LambdaInvokeParameters} parameters
   */
  static toAsl(parameters) {
    const actionPayload = ActionExecutionFactory.toRequestPayload({
      actionPayload: parameters.payload,
    });
    return {
      FunctionName: parameters.functionName,
      Payload: actionPayload?.action,
    };
  }
}

export default LambdaInvokeParameters;
