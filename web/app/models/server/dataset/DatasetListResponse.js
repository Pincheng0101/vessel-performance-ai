import DatasetResponse from './DatasetResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetListResponse {
  /**
   * @type {DatasetResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.datasets.map(item => new DatasetResponse(item));
    this.nextToken = response.next_token;
    this.outputFields = response.output_fields;
  }
}

export default DatasetListResponse;
