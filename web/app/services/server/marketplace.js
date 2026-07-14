import { MarketplaceOnboarding, MarketplaceOnboardingResponse } from '~/models/server/marketplace';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function marketplace({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ActionExecutionResponse, H3Error<ErrorResponse>>}
   */
  const onboarding = ({
    email,
    username,
    xAmznMarketplaceToken,
  }) => {
    return client.post('/marketplace/onboarding', {
      watch: false,
      lazy: true,
      body: MarketplaceOnboarding.toRequestPayload({
        email,
        username,
        xAmznMarketplaceToken,
      }),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MarketplaceOnboardingResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    onboarding,
  };
};
