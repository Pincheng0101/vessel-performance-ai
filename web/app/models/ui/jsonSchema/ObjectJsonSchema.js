import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';
import JsonSchemaFactory from './JsonSchemaFactory';

class ObjectJsonSchema extends JsonSchema {
  constructor({
    _order,
    anyOf,
    defaultValue,
    description,
    properties,
    required,
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
        ? [JsonSchemaConstant.DataType.OBJECT.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.OBJECT.value,
    });
    this.properties = Object.fromEntries(
      Object.entries(properties || {}).map(([key, value]) => {
        return [key, JsonSchemaFactory.create(value)];
      }),
    );
    this.required = required || [];
  }
}

export default ObjectJsonSchema;
