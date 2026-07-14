import { ListConstant } from '~/constants';
import { LoaderFactory, LoaderListResponse, LoaderResponseFactory } from '~/models/server/loader';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { Loader, LoaderResponse } from '~/models/server/loader'
 */

export default function loader({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<LoaderListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
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
    return client.post('/resource/list-loaders', {
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
          response._data = new LoaderListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Loader} resource
   * @returns {AsyncData<LoaderResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-loader', {
      watch: false,
      lazy: true,
      body: LoaderFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = LoaderResponseFactory.create(finalResponse._data.loader);
        }
      },
    });
  };

  /**
   * @param {Loader} resource
   * @returns {AsyncData<LoaderResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    loaderId: loader_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-loader', {
      watch: false,
      lazy,
      body: {
        loader_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = LoaderResponseFactory.create(finalResponse._data.loader);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Loader} resource
   * @returns {AsyncData<LoaderResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-loader', {
      watch: false,
      lazy: true,
      body: LoaderFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Loader} resource
   * @returns {AsyncData<LoaderResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    loaderId: loader_id,
  }) => {
    return client.post('/resource/delete-loader', {
      watch: false,
      lazy: true,
      body: {
        loader_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} loaderId
   * @param {string} newLoaderName
   * @param {string} knowledgeBaseId
   * @returns {AsyncData<LoaderResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    loaderId: loader_id,
    newLoaderName: new_loader_name,
    knowledgeBaseId: knowledge_base_id,
  }) => {
    const { data, error } = await get({ loaderId: loader_id });

    if (error.value) {
      return { data: null, error };
    }

    const newLoader = LoaderFactory.create({
      ...data.value,
      loaderName: new_loader_name,
      knowledgeBaseId: knowledge_base_id,
    });
    return create(newLoader);
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    duplicate,
  };
};
