import JsonVariable from './JsonVariable';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class JsonVariableResponse extends JsonVariable {
  constructor({
    status,
    system_info,
    updated_ts,
    value,
    variable_id,
    variable_name,
    variable_type,
  } = {}) {
    super({
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
      variableId: variable_id,
      variableName: variable_name,
      variableType: variable_type,
    });
    this.value = value;
  }
}

export default JsonVariableResponse;
