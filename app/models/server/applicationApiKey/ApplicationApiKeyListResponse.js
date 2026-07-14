import ApplicationApiKeyResponse from './ApplicationApiKeyResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ApplicationApiKeyListResponse {
  /**
   * @type {ApplicationApiKeyResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.application_api_keys.map(item => new ApplicationApiKeyResponse(item));
    this.nextToken = response.next_token;
  }
}

export default ApplicationApiKeyListResponse;
