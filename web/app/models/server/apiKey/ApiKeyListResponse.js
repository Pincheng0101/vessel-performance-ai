import ApiKeyResponse from './ApiKeyResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ApiKeyListResponse {
  /**
   * @type {ApiKeyResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.api_keys.map(item => new ApiKeyResponse(item));
    this.nextToken = response.next_token;
  }
}

export default ApiKeyListResponse;
