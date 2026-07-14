class JsonSchemaTableItem {
  constructor({
    name,
    mainType,
    required,
    nullable,
    allowCustomValue,
    contentMediaType,
    contentMediaTypes,
    ...params
  } = {}) {
    this.name = name;
    this.mainType = mainType;
    this.required = required;
    this.nullable = nullable;
    this.allowCustomValue = allowCustomValue;
    this.contentMediaType = contentMediaType;
    this.contentMediaTypes = contentMediaTypes;
    Object.assign(this, params);
  }
}

export default JsonSchemaTableItem;
