import { MultiRequestGetRequest, MultiRequestGetResponse } from '~/models/server/multiRequest';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { MultiRequestResourceQuery } from '~/models/server/multiRequest'
 */

export default function MultiRequest({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {MultiRequestResourceQuery[]} resourceQueries
   * @returns {AsyncData<MultiRequestGetResponse, H3Error<ErrorResponse>>}
   */
  const get = (resourceQueries, {
    lazy = true,
  } = {}) => {
    return client.post('/resource/multi-request', {
      watch: false,
      lazy,
      body: MultiRequestGetRequest.toRequestPayload(resourceQueries),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MultiRequestGetResponse(finalResponse._data.responses);
        }
      },
    });
  };

  return {
    get,
  };
}
