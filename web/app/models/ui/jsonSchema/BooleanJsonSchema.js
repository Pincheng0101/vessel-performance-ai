import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class BooleanJsonSchema extends JsonSchema {
  constructor({
    _order,
    anyOf,
    defaultValue,
    description,
    enumValue,
    title,
    type,
  } = {}) {
    super({
      _order,
      anyOf,
      defaultValue,
      description,
      enumValue,
      title,
      type: arrUtils.cast(type).includes(JsonSchemaConstant.DataType.NULL.value)
        ? [JsonSchemaConstant.DataType.BOOLEAN.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.BOOLEAN.value,
    });
  }
}

export default BooleanJsonSchema;
