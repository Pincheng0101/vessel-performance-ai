import UiDataResponse from './UiDataResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UiDataBatchResponse {
  constructor({
    data,
    missing_keys,
  } = {}) {
    this.data = (data || []).map(item => new UiDataResponse(item));
    this.missingKeys = missing_keys || [];
  }
}

export default UiDataBatchResponse;
