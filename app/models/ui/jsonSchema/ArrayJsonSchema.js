import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';
import JsonSchemaFactory from './JsonSchemaFactory';

class ArrayJsonSchema extends JsonSchema {
  constructor({
    _order,
    anyOf,
    defaultValue,
    description,
    items,
    maxItems,
    minItems,
    title,
    type,
  } = {}) {
    super({
      _order,
      anyOf,
      defaultValue,
      description,
      title,
      type: arrUtils.cast(type).includes(JsonSchemaConstant.DataType.NULL.value)
        ? [JsonSchemaConstant.DataType.ARRAY.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.ARRAY.value,
    });
    this.items = JsonSchemaFactory.create(items);
    this.maxItems = maxItems;
    this.minItems = minItems;
  }
}

export default ArrayJsonSchema;
