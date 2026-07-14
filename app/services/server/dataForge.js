import { ItemsGenerationResponse, ItemsGenerationStartRequest } from '~/models/server/dataForge';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function dataForge({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ItemsGenerationResponse, H3Error<ErrorResponse>>}
   */
  const startItemsGeneration = (payload) => {
    return client.post('/dataforge/start-items-generation', {
      watch: false,
      lazy: true,
      body: ItemsGenerationStartRequest.toRequestPayload(payload),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ItemsGenerationResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<ItemsGenerationResponse, H3Error<ErrorResponse>>}
   */
  const getItemsGeneration = ({
    executionArn: execution_arn,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/dataforge/get-items-generation', {
      watch: false,
      lazy,
      signal,
      body: {
        execution_arn,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ItemsGenerationResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    startItemsGeneration,
    getItemsGeneration,
  };
}
