import { ListConstant } from '~/constants';
import { RankerFactory, RankerListResponse, RankerResponseFactory } from '~/models/server/ranker';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { Ranker, RankerResponse } from '~/models/server/ranker'
 */

export default function ranker({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<RankerListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-rankers', {
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
          response._data = new RankerListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Ranker} resource
   * @returns {AsyncData<RankerResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-ranker', {
      watch: false,
      lazy: true,
      body: RankerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = RankerResponseFactory.create(finalResponse._data.ranker);
        }
      },
    });
  };

  /**
   * @param {Ranker} resource
   * @returns {AsyncData<RankerResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    rankerId: ranker_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-ranker', {
      watch: false,
      lazy,
      body: {
        ranker_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = RankerResponseFactory.create(finalResponse._data.ranker);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Ranker} resource
   * @returns {AsyncData<RankerResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-ranker', {
      watch: false,
      lazy: true,
      body: RankerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Ranker} resource
   * @returns {AsyncData<RankerResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    rankerId: ranker_id,
  }) => {
    return client.post('/resource/delete-ranker', {
      watch: false,
      lazy: true,
      body: {
        ranker_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} rankerId
   * @param {string} newRankerName
   * @returns {AsyncData<RankerResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    rankerId: ranker_id,
    newRankerName: new_ranker_name,
  }) => {
    const { data, error } = await get({ rankerId: ranker_id });

    if (error.value) {
      return { data: null, error };
    }

    const newRanker = RankerFactory.create({
      ...data.value,
      rankerName: new_ranker_name,
    });
    return create(newRanker);
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
