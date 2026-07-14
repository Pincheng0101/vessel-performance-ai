import { ListConstant } from '~/constants';
import { VariableFactory, VariableListResponse, VariableResponseFactory } from '~/models/server/variable';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { Variable, VariableResponse } from '~/models/server/variable'
 */

export default function variable({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<VariableListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-variables', {
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
          response._data = new VariableListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Variable} resource
   * @returns {AsyncData<VariableResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-variable', {
      watch: false,
      lazy: true,
      body: VariableFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = VariableResponseFactory.create(finalResponse._data.variable);
        }
      },
    });
  };

  /**
   * @param {Variable} resource
   * @returns {AsyncData<VariableResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    variableId: variable_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-variable', {
      watch: false,
      lazy,
      body: {
        variable_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = VariableResponseFactory.create(finalResponse._data.variable);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Variable} resource
   * @returns {AsyncData<VariableResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-variable', {
      watch: false,
      lazy: true,
      body: VariableFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Variable} resource
   * @returns {AsyncData<VariableResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    variableId: variable_id,
  }) => {
    return client.post('/resource/delete-variable', {
      watch: false,
      lazy: true,
      body: {
        variable_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} variableId
   * @param {string} newVariableName
   * @returns {AsyncData<VariableResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    variableId: variable_id,
    newVariableName: new_variable_name,
  }) => {
    const { data, error } = await get({ variableId: variable_id });

    if (error.value) {
      return { data: null, error };
    }

    const newVariable = VariableFactory.create({
      ...data.value,
      variableName: new_variable_name,
    });
    return create(newVariable);
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
