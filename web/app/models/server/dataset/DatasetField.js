class DatasetField {
  constructor({
    name,
    description,
  } = {}) {
    this.name = name;
    this.description = description;
  }

  static toRequestPayload(field) {
    return {
      name: field.name,
      description: field.description,
    };
  }
}

export default DatasetField;
