import { ListConstant } from '~/constants';
import { LlmFactory, LlmListResponse, LlmResponseFactory } from '~/models/server/llm';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { Llm, LlmResponse } from '~/models/server/llm'
 */

export default function Llm({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {Llm} resource
   * @returns {AsyncData<LlmListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-llms', {
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
          response._data = new LlmListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Llm} resource
   * @returns {AsyncData<LlmResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-llm', {
      watch: false,
      lazy: true,
      body: LlmFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = LlmResponseFactory.create(finalResponse._data.llm);
        }
      },
    });
  };

  /**
   * @param {Llm} resource
   * @returns {AsyncData<LlmResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    llmId: llm_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-llm', {
      watch: false,
      lazy,
      body: {
        llm_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = LlmResponseFactory.create(finalResponse._data.llm);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Llm} resource
   * @returns {AsyncData<LlmResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-llm', {
      watch: false,
      lazy: true,
      body: LlmFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Llm} resource
   * @returns {AsyncData<LlmResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    llmId: llm_id,
  }) => {
    return client.post('/resource/delete-llm', {
      watch: false,
      lazy: true,
      body: {
        llm_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} llmId
   * @param {string} newLlmName
   * @returns {AsyncData<LlmResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    llmId: llm_id,
    newLlmName: new_llm_name,
  }) => {
    const { data, error } = await get({ llmId: llm_id });

    if (error.value) {
      return { data: null, error };
    }

    const newLlm = LlmFactory.create({
      ...data.value,
      llmName: new_llm_name,
    });
    return create(newLlm);
  };

  /**
   * @param {Llm} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const validate = (resource) => {
    return client.post('/resource/validate-llm', {
      watch: false,
      lazy: true,
      body: LlmFactory.toValidateRequestPayload(resource),
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
