import DatasetItemBaseResponse from './DatasetItemBaseResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemUpdateResponse extends DatasetItemBaseResponse {
  constructor({
    updated_count,
    status,
    failures,
  } = {}) {
    super({
      status,
      failures,
    });
    this.updatedCount = updated_count;
  }

  get successCount() {
    return this.updatedCount;
  }
}

export default DatasetItemUpdateResponse;
