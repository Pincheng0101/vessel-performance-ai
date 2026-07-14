import Feature from './Feature';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class FeatureResponse extends Feature {
  constructor({
    enabled,
    feature_name,
  } = {}) {
    super({
      enabled,
      featureName: feature_name,
    });
  }
}

export default FeatureResponse;
