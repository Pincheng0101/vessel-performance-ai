import { ListConstant } from '~/constants';
import { ChunkerFactory, ChunkerListResponse, ChunkerResponseFactory } from '~/models/server/chunker';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { Chunker, ChunkerResponse } from '~/models/server/chunker'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function chunker({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ChunkerListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-chunkers', {
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
          response._data = new ChunkerListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Chunker} resource
   * @returns {AsyncData<ChunkerResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-chunker', {
      watch: false,
      lazy: true,
      body: ChunkerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = ChunkerResponseFactory.create(finalResponse._data.chunker);
        }
      },
    });
  };

  /**
   * @param {Chunker} resource
   * @returns {AsyncData<ChunkerResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    chunkerId: chunker_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-chunker', {
      watch: false,
      lazy,
      body: {
        chunker_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = ChunkerResponseFactory.create(finalResponse._data.chunker);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Chunker} resource
   * @returns {AsyncData<ChunkerResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-chunker', {
      watch: false,
      lazy: true,
      body: ChunkerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Chunker} resource
   * @returns {AsyncData<ChunkerResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    chunkerId: chunker_id,
  }) => {
    return client.post('/resource/delete-chunker', {
      watch: false,
      lazy: true,
      body: {
        chunker_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} chunkerId
   * @param {string} newChunkerName
   * @returns {AsyncData<ChunkerResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    chunkerId: chunker_id,
    newChunkerName: new_chunker_name,
  }) => {
    const { data, error } = await get({ chunkerId: chunker_id });

    if (error.value) {
      return { data: null, error };
    }

    const newChunker = ChunkerFactory.create({
      ...data.value,
      chunkerName: new_chunker_name,
    });
    return create(newChunker);
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
