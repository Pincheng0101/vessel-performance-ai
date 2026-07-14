import UiData from './UiData';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UiDataResponse extends UiData {
  constructor({
    key,
    ttl,
    value,
  } = {}) {
    super({
      key,
      value,
    });
    this.ttl = ttl;
  }
}

export default UiDataResponse;
