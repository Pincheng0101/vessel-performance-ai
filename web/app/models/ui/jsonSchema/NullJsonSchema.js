import { JsonSchemaConstant } from '~/constants';
import JsonSchema from './JsonSchema';

class NullJsonSchema extends JsonSchema {
  type = JsonSchemaConstant.DataType.NULL.value;

  constructor({
    _order,
    defaultValue,
    description,
    title,
  } = {}) {
    super({
      _order,
      defaultValue,
      description,
      title,
    });
  }
}

export default NullJsonSchema;
