import FeatureResponse from './FeatureResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class FeatureListResponse {
  /**
   * @type {FeatureResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.features.map(item => new FeatureResponse(item));
  }
}

export default FeatureListResponse;
