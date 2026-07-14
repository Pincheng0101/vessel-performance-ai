import { VariableConstant } from '~/constants';
import JsonVariableResponse from './JsonVariableResponse';
import VariableResponse from './VariableResponse';

class VariableResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.variable_type
   */
  static create(payload) {
    switch (payload.variable_type) {
      case VariableConstant.Type.JSON.value:
        return new JsonVariableResponse(payload);
      default:
        return new VariableResponse(payload);
    }
  }
}

export default VariableResponseFactory;
