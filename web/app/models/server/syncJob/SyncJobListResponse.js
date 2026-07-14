import SyncJobResponse from './SyncJobResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SyncJobListResponse {
  /**
   * @type {SyncJobResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.sync_jobs.map(item => new SyncJobResponse(item));
    this.nextToken = response.next_token;
  }
}

export default SyncJobListResponse;
