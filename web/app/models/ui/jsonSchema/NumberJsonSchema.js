import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class NumberJsonSchema extends JsonSchema {
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
      anyOf,
      defaultValue,
      description,
      enumValue,
      title,
      type: arrUtils.cast(type).includes(JsonSchemaConstant.DataType.NULL.value)
        ? [JsonSchemaConstant.DataType.NUMBER.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.NUMBER.value,
    });
    this._step = _step;
    this.maximum = maximum;
    this.minimum = minimum;
  }
}

export default NumberJsonSchema;
