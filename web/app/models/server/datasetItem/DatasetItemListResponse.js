import DatasetItemBaseResponse from './DatasetItemBaseResponse';
import DatasetItemResponse from './DatasetItemResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemListResponse extends DatasetItemBaseResponse {
  /**
   * @type {DatasetItemResponse[]}
   */
  data = [];

  constructor(response) {
    super({
      status: response.status,
      failures: response.failures,
    });
    this.data = response.dataset_items?.map(item => new DatasetItemResponse(item));
    this.nextToken = response.next_token;
  }
}

export default DatasetItemListResponse;
