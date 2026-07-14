import { ListConstant } from '~/constants';
import { FeatureListResponse } from '~/models/server/feature';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function feature({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<FeatureListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    query = ListConstant.DefaultParams.QUERY,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/feature/list-features', {
      watch: false,
      lazy,
      body: {
        search_string: query,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new FeatureListResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
  };
};
