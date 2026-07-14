import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class FileJsonSchema extends JsonSchema {
  constructor({
    _order,
    anyOf,
    contentMediaType,
    defaultValue,
    description,
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
        ? [JsonSchemaConstant.DataType.FILE.value, JsonSchemaConstant.DataType.NULL.value]
        : JsonSchemaConstant.DataType.FILE.value,
    });
    this.contentMediaType = contentMediaType;
  }
}

export default FileJsonSchema;
