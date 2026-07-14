class UiData {
  constructor({
    key,
    value,
  } = {}) {
    this.key = key;
    this.value = value;
  }

  /**
   * @param {UiData} data
   */
  static toRequestPayload(data) {
    return {
      key: data.key,
      value: data.value,
    };
  }
}

export default UiData;
