import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class IntegerJsonSchema extends JsonSchema {
  constructor({
    _order,
    _step,
    anyOf,
    defaultValue,
    description,
    enumValue,
    maximum,
    minimum,
    title,
    type,
  } = {}) {
    super({
      _order,
      _step,
      anyOf,
      defaultValue,
      description,
      enumValue,
      title,
      maximum,
      minimum,
      type: arrUtils.cast(type).includes(JsonSchemaConstant.DataType.NULL.value)
        ? [JsonSchemaConstant.DataType.INTEGER.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.INTEGER.value,
    });
  }
}

export default IntegerJsonSchema;
