import { UiData, UiDataBatchResponse, UiDataResponse } from '~/models/server/uiData';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function uiData({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {UiData} data
   * @returns {AsyncData<UiDataResponse, H3Error<ErrorResponse>>}
   */
  const set = (data) => {
    return client.post('/ui/set-ui-data', {
      watch: false,
      lazy: true,
      body: UiData.toRequestPayload(data),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {UiData} data
   * @returns {AsyncData<UiDataResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    key,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/ui/get-ui-data', {
      watch: false,
      lazy,
      body: {
        key,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: (context) => {
        // Do nothing if ui data does not exist
        if (context.response.status === 400 && String(context.response._data?.detail).includes('not found')) {
          return;
        }
        handleResponseError(context);
      },
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UiDataResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<UiDataBatchResponse, H3Error<ErrorResponse>>}
   */
  const batchGet = ({
    keys = [],
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/ui/batch-get-ui-data', {
      watch: false,
      lazy,
      body: {
        keys,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UiDataBatchResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {UiData} data
   * @returns {AsyncData<UiDataResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    key,
  }) => {
    return client.post('/ui/delete-ui-data', {
      watch: false,
      lazy: true,
      body: {
        key,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    batchGet,
    set,
    get,
    destroy,
  };
}
