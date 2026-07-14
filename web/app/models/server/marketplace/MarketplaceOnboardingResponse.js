/**
 * This class receives data from the API with parameters in snake_case.
 */
class MarketplaceOnboardingResponse {
  constructor({
    status,
    message,
  } = {}) {
    this.status = status;
    this.message = message;
  }
}

export default MarketplaceOnboardingResponse;
