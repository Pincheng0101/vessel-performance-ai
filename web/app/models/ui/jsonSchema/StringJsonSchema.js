import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class StringJsonSchema extends JsonSchema {
  constructor({
    _order,
    anyOf,
    defaultValue,
    description,
    enumValue,
    maxLength,
    minLength,
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
        ? [JsonSchemaConstant.DataType.STRING.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.STRING.value,
    });
    this.maxLength = maxLength;
    this.minLength = minLength;
  }
}

export default StringJsonSchema;
