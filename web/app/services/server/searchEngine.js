import { ListConstant } from '~/constants';
import { SearchEngineFactory, SearchEngineListResponse, SearchEngineResponseFactory } from '~/models/server/searchEngine';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { SearchEngine, SearchEngineResponse } from '~/models/server/searchEngine'
 */

export default function searchEngine({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<SearchEngineListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    nextToken: next_token,
    limit = ListConstant.DefaultParams.SORT_FIELD,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-search-engines', {
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
          response._data = new SearchEngineListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {SearchEngine} resource
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-search-engine', {
      watch: false,
      lazy: true,
      body: SearchEngineFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = SearchEngineResponseFactory.create(finalResponse._data.search_engine);
        }
      },
    });
  };

  /**
   * @param {SearchEngine} resource
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    searchEngineId: search_engine_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-search-engine', {
      watch: false,
      lazy,
      body: {
        search_engine_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = SearchEngineResponseFactory.create(finalResponse._data.search_engine);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {SearchEngine} resource
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-search-engine', {
      watch: false,
      lazy: true,
      body: SearchEngineFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {SearchEngine} resource
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    searchEngineId: search_engine_id,
  }) => {
    return client.post('/resource/delete-search-engine', {
      watch: false,
      lazy: true,
      body: {
        search_engine_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} searchEngineId
   * @param {string} newSearchEngineName
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    searchEngineId: search_engine_id,
    newSearchEngineName: new_search_engine_name,
  }) => {
    const { data, error } = await get({ searchEngineId: search_engine_id });

    if (error.value) {
      return { data: null, error };
    }

    const newSearchEngine = SearchEngineFactory.create({
      ...data.value,
      searchEngineName: new_search_engine_name,
    });
    return create(newSearchEngine);
  };

  /**
   * @param {SearchEngine} resource
   * @returns {AsyncData<SearchEngineResponse, H3Error<ErrorResponse>>}
   */
  const validate = (resource) => {
    return client.post('/resource/validate-search-engine', {
      watch: false,
      lazy: true,
      body: SearchEngineFactory.toValidateRequestPayload(resource),
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
    duplicate,
    validate,
  };
}
