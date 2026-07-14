import { ListConstant } from '~/constants';
import { RetrieverFactory, RetrieverListResponse, RetrieverResponseFactory } from '~/models/server/retriever';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { Retriever, RetrieverResponse } from '~/models/server/retriever'
 */

export default function retriever({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<RetrieverListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-retrievers', {
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
          response._data = new RetrieverListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Retriever} resource
   * @returns {AsyncData<RetrieverResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-retriever', {
      watch: false,
      lazy: true,
      body: RetrieverFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = RetrieverResponseFactory.create(finalResponse._data.retriever);
        }
      },
    });
  };

  /**
   * @param {Retriever} resource
   * @returns {AsyncData<RetrieverResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    retrieverId: retriever_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-retriever', {
      watch: false,
      lazy,
      body: {
        retriever_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = RetrieverResponseFactory.create(finalResponse._data.retriever);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Retriever} resource
   * @returns {AsyncData<RetrieverResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-retriever', {
      watch: false,
      lazy: true,
      body: RetrieverFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Retriever} resource
   * @returns {AsyncData<RetrieverResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    retrieverId: retriever_id,
  }) => {
    return client.post('/resource/delete-retriever', {
      watch: false,
      lazy: true,
      body: {
        retriever_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} retrieverId
   * @param {string} newRetrieverName
   * @returns {AsyncData<RetrieverResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    retrieverId: retriever_id,
    newRetrieverName: new_retriever_name,
  }) => {
    const { data, error } = await get({ retrieverId: retriever_id });

    if (error.value) {
      return { data: null, error };
    }

    const newRetriever = RetrieverFactory.create({
      ...data.value,
      retrieverName: new_retriever_name,
    });
    return create(newRetriever);
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
