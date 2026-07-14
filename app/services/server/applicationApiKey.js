import { ListConstant } from '~/constants';
import { ApplicationApiKey, ApplicationApiKeyListResponse, ApplicationApiKeyResponse } from '~/models/server/applicationApiKey';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function applicationApiKey({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ApplicationApiKeyListResponse, H3Error<ErrorResponse>>}
   */
  const adminList = ({
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/account/admin-list-application-api-keys', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApplicationApiKeyListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<ApplicationApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const adminGet = ({
    applicationApiKeyId: application_api_key_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/account/admin-get-application-api-key', {
      watch: false,
      lazy,
      body: {
        application_api_key_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApplicationApiKeyResponse(finalResponse._data.application_api_key);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {ApplicationApiKey} account
   * @returns {AsyncData<ApplicationApiKeyResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (account) => {
    return client.post('/account/admin-create-application-api-key', {
      watch: false,
      lazy: true,
      body: ApplicationApiKey.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ApplicationApiKeyResponse(finalResponse._data.application_api_key);
        }
      },
    });
  };

  /**
   * @param {ApplicationApiKey} account
   * @returns {AsyncData<{status: string}, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (account) => {
    return client.post('/account/admin-update-application-api-key', {
      watch: false,
      lazy: true,
      body: ApplicationApiKey.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<{status: string}, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    applicationApiKeyId: application_api_key_id,
  }) => {
    return client.post('/account/admin-delete-application-api-key', {
      watch: false,
      lazy: true,
      body: {
        application_api_key_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    adminList,
    adminGet,
    adminCreate,
    adminUpdate,
    adminDestroy,
  };
}
