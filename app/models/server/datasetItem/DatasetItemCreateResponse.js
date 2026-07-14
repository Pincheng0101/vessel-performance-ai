import DatasetItemBaseResponse from './DatasetItemBaseResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemCreateResponse extends DatasetItemBaseResponse {
  constructor({
    created_count,
    status,
    failures,
  } = {}) {
    super({
      status,
      failures,
    });
    this.createdCount = created_count;
  }

  get successCount() {
    return this.createdCount;
  }
}

export default DatasetItemCreateResponse;
