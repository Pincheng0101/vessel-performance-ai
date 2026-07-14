class MarketplaceOnboarding {
  constructor({
    email,
    username,
    xAmznMarketplaceToken,
  } = {}) {
    this.email = email;
    this.username = username;
    this.xAmznMarketplaceToken = xAmznMarketplaceToken;
  }

  /**
   * @param {MarketplaceOnboarding} marketplaceOnboarding
   */
  static toRequestPayload(marketplaceOnboarding) {
    return {
      'email': marketplaceOnboarding.email,
      'username': marketplaceOnboarding.username,
      'x-amzn-marketplace-token': marketplaceOnboarding.xAmznMarketplaceToken,
    };
  }
}

export default MarketplaceOnboarding;
