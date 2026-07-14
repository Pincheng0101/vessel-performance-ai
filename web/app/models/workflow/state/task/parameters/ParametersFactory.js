import { StateConstant } from '~/constants';
import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';

class ParametersFactory {
  static create(resource, parameters) {
    switch (resource) {
      case StateConstant.Resource.LAMBDA_INVOKE:
        return new LambdaInvokeParameters(parameters);
      default:
        return new LambdaInvokeParameters(parameters);
    }
  }

  /**
   * @param {String} resource
   * @param {Object} parameters
   */
  static toAsl(resource, parameters) {
    switch (resource) {
      case StateConstant.Resource.LAMBDA_INVOKE:
        return LambdaInvokeParameters.toAsl(parameters);
      default:
        return LambdaInvokeParameters.toAsl(parameters);
    }
  }

  /**
   * @param {String} resource
   * @param {Object} definition
   */
  static createFromAsl(resource, definition) {
    switch (resource) {
      case StateConstant.Resource.LAMBDA_INVOKE:
        return LambdaInvokeParameters.createFromAsl(definition);
      default:
        return LambdaInvokeParameters.createFromAsl(definition);
    }
  }
}

export default ParametersFactory;
