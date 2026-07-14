import { AccountConstant, ListConstant } from '~/constants';
import { ApiKey, ApiKeyListResponse, ApiKeyResponse } from '~/models/server/apiKey';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function apiKey({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ApiKeyListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    accountType = AccountConstant.Base.API_KEY.value,
    outputFields: output_fields,
    userName: username,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    searchString: search_string,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/account/list-api-keys', {
      watch: false,
      lazy,
      signal,
      body: {
        username,
        next_token,
        limit,
        output_fields,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string,
        accountType,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApiKeyListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {ApiKey} account
   * @returns {AsyncData<ApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const create = (account) => {
    return client.post('/account/create-api-key', {
      watch: false,
      lazy: true,
      body: ApiKey.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApiKeyResponse(finalResponse._data.api_key);
        }
      },
    });
  };

  /**
   * @param {ApiKey} account
   * @returns {AsyncData<ApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    apiKeyId: api_key_id,
    userName: username,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/account/get-api-key', {
      watch: false,
      lazy,
      body: {
        api_key_id,
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApiKeyResponse(finalResponse._data.api_key);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {ApiKey} account
   * @returns {AsyncData<ApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const update = (account) => {
    return client.post('/account/update-api-key', {
      watch: false,
      lazy: true,
      body: ApiKey.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {ApiKey} account
   * @returns {AsyncData<ApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    apiKeyId: api_key_id,
    userName: username,
  }) => {
    return client.post('/account/delete-api-key', {
      watch: false,
      lazy: true,
      body: {
        api_key_id,
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
  };
}
