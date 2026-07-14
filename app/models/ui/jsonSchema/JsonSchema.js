class JsonSchema {
  constructor({
    _order, // Custom property
    anyOf,
    defaultValue,
    description,
    enumValue,
    oneOf,
    title,
    type,
  } = {}) {
    this._order = _order;
    this.anyOf = anyOf;
    this.default = defaultValue;
    this.description = description;
    this.enum = enumValue;
    this.oneOf = oneOf;
    this.title = title;
    this.type = type;
  }
}

export default JsonSchema;
