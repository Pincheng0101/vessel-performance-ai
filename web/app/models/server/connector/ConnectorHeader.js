class ConnectorHeader {
  constructor({
    value,
    isSecret,
  } = {}) {
    this.value = value ?? null;
    this.isSecret = isSecret ?? false;
  }

  static toRequestPayload({
    value,
    isSecret,
  } = {}) {
    return {
      value,
      is_secret: isSecret,
    };
  }
}

export default ConnectorHeader;
