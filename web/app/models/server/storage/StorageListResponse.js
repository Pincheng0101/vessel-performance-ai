import StorageResponse from './StorageResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageListResponse {
  /**
   * @type {StorageResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.storages.map(item => new StorageResponse(item));
    this.nextToken = response.next_token;
  }
}

export default StorageListResponse;
