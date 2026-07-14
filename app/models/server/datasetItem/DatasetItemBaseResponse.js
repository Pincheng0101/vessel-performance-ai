import DatasetItemFailureResponse from './DatasetItemFailureResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemBaseResponse {
  constructor({
    status,
    failures,
  } = {}) {
    this.status = status;
    this.failures = failures?.map(item => new DatasetItemFailureResponse(item));
  }
}

export default DatasetItemBaseResponse;
