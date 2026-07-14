import CommonPrefixResponse from './CommonPrefixResponse';
import StorageObjectResponse from './StorageObjectResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageObjectListResponse {
  /**
   * @type {StorageObjectResponse[]}
   */
  data = [];
  /**
   * @type {CommonPrefixResponse[]}
   */
  commonPrefixes = [];

  constructor(response) {
    this.data = response.storage_objects.map(item => new StorageObjectResponse(item));
    this.nextToken = response.next_token;
    this.commonPrefixes = response.common_prefixes.map(item => new CommonPrefixResponse(item));
  }
}

export default StorageObjectListResponse;
