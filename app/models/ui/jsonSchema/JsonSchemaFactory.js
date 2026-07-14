import { JsonSchemaConstant } from '~/constants';
import ArrayJsonSchema from './ArrayJsonSchema';
import BooleanJsonSchema from './BooleanJsonSchema';
import FileJsonSchema from './FileJsonSchema';
import IntegerJsonSchema from './IntegerJsonSchema';
import NullJsonSchema from './NullJsonSchema';
import NumberJsonSchema from './NumberJsonSchema';
import ObjectJsonSchema from './ObjectJsonSchema';
import StringJsonSchema from './StringJsonSchema';

class JsonSchemaFactory {
  /**
   * @param {JsonSchema} property
   */
  static create(property = {}) {
    const item = {
      ...property,
      defaultValue: property.default,
      enumValue: property.enum,
    };

    // Handle special types
    switch (true) {
      case JsonSchemaFactory.isFileType(property):
        return new FileJsonSchema(item);
    }

    // Handle general types
    switch (jsonSchemaUtils.getMainType(property)) {
      case JsonSchemaConstant.DataType.STRING.value:
        return new StringJsonSchema(item);
      case JsonSchemaConstant.DataType.NUMBER.value:
        return new NumberJsonSchema(item);
      case JsonSchemaConstant.DataType.INTEGER.value:
        return new IntegerJsonSchema(item);
      case JsonSchemaConstant.DataType.BOOLEAN.value:
        return new BooleanJsonSchema(item);
      case JsonSchemaConstant.DataType.ARRAY.value:
        return new ArrayJsonSchema(item);
      case JsonSchemaConstant.DataType.OBJECT.value:
        return new ObjectJsonSchema(item);
      default:
        return new NullJsonSchema(item);
    }
  }

  static isFileType(property) {
    const mainType = jsonSchemaUtils.getMainType(property);
    if (mainType === JsonSchemaConstant.DataType.FILE.value) return true;
    if (mainType === JsonSchemaConstant.DataType.STRING.value) {
      if (property.contentMediaType !== undefined) return true;
      if (property.anyOf?.some(item => item.contentMediaType !== undefined)) return true;
    }
  }
}

export default JsonSchemaFactory;
