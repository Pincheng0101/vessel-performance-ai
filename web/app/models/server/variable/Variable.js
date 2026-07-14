import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Variable extends Resource {
  constructor({
    status,
    systemInfo,
    updatedTs,
    variableName,
    variableId,
    variableType,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.variableId = variableId ?? '';
    this.variableName = variableName ?? '';
    this.variableType = variableType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.VARIABLE.value;
  }

  get id() {
    return this.variableId;
  }

  get name() {
    return this.variableName;
  }

  get type() {
    return this.variableType;
  }

  /**
   * @param {Variable} resource
   */
  static toRequestPayload(resource) {
    return {
      variable_id: resource.variableId,
      variable_name: resource.variableName,
      variable_type: resource.variableType,
    };
  }
}

export default Variable;
