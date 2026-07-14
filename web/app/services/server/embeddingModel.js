import { ListConstant } from '~/constants';
import { EmbeddingModelFactory, EmbeddingModelListResponse, EmbeddingModelResponseFactory } from '~/models/server/embeddingModel';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { EmbeddingModel, EmbeddingModelResponse } from '~/models/server/connector'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function embeddingModel({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<EmbeddingModelListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-embedding-models', {
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
          response._data = new EmbeddingModelListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {EmbeddingModel} resource
   * @returns {AsyncData<EmbeddingModelResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-embedding-model', {
      watch: false,
      lazy: true,
      body: EmbeddingModelFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = EmbeddingModelResponseFactory.create(finalResponse._data.embedding_model);
        }
      },
    });
  };

  /**
   * @param {EmbeddingModel} resource
   * @returns {AsyncData<EmbeddingModelResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    embeddingModelId: embedding_model_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-embedding-model', {
      watch: false,
      lazy,
      body: {
        embedding_model_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = EmbeddingModelResponseFactory.create(finalResponse._data.embedding_model);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {EmbeddingModel} resource
   * @returns {AsyncData<EmbeddingModelResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-embedding-model', {
      watch: false,
      lazy: true,
      body: EmbeddingModelFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {EmbeddingModel} resource
   * @returns {AsyncData<EmbeddingModelResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    embeddingModelId: embedding_model_id,
  }) => {
    return client.post('/resource/delete-embedding-model', {
      watch: false,
      lazy: true,
      body: {
        embedding_model_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} embeddingModelId
   * @param {string} newEmbeddingModelName
   * @returns {AsyncData<EmbeddingModelResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    embeddingModelId: embedding_model_id,
    newEmbeddingModelName: new_embedding_model_name,
  }) => {
    const { data, error } = await get({ embeddingModelId: embedding_model_id });

    if (error.value) {
      return { data: null, error };
    }

    const newEmbeddingModel = EmbeddingModelFactory.create({
      ...data.value,
      embeddingModelName: new_embedding_model_name,
    });
    return create(newEmbeddingModel);
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
