import { VariableConstant } from '~/constants';
import JsonVariable from './JsonVariable';
import Variable from './Variable';

class VariableFactory {
  /**
   * @param {Variable} payload
   */
  static create(payload) {
    switch (payload.variableType) {
      case VariableConstant.Type.JSON.value:
        return new JsonVariable(payload);
      default:
        return new Variable(payload);
    }
  }

  /**
   * @param {JsonVariable} resource
   */
  static toRequestPayload(resource) {
    switch (resource.variableType) {
      case VariableConstant.Type.JSON.value:
        return JsonVariable.toRequestPayload(resource);
      default:
        return Variable.toRequestPayload(resource);
    }
  }
}

export default VariableFactory;
