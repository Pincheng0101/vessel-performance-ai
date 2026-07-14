import DatasetItemBaseResponse from './DatasetItemBaseResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemDeleteResponse extends DatasetItemBaseResponse {
  constructor({
    deleted_count,
    status,
    failures,
  } = {}) {
    super({
      status,
      failures,
    });
    this.deletedCount = deleted_count;
  }

  get successCount() {
    return this.deletedCount;
  }
}

export default DatasetItemDeleteResponse;
