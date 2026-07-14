import { ListConstant } from '~/constants';
import { SyncJob, SyncJobListResponse, SyncJobResponse } from '~/models/server/syncJob';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function syncJob({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<SyncJobListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    loaderId: loader_id,
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
    return client.post('/runtime/list-sync-jobs', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        loader_id,
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
          response._data = new SyncJobListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {SyncJob} runtime
   * @returns {AsyncData<SyncJobResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    syncJobId: sync_job_id,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/get-sync-job', {
      watch: false,
      lazy,
      signal,
      body: {
        sync_job_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new SyncJobResponse(finalResponse._data.sync_job);
        }
      },
    });
  };

  /**
   * @param {SyncJob} runtime
   * @returns {AsyncData<SyncJobResponse, H3Error<ErrorResponse>>}
   */
  const start = (runtime) => {
    return client.post('/runtime/start-sync-job', {
      watch: false,
      lazy: true,
      body: SyncJob.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new SyncJobResponse(finalResponse._data.sync_job);
        }
      },
    });
  };

  /**
   * @param {SyncJob} runtime
   * @returns {AsyncData<SyncJobResponse, H3Error<ErrorResponse>>}
   */
  const stop = ({
    syncJobId: sync_job_id,
  }) => {
    return client.post('/runtime/stop-sync-job', {
      watch: false,
      lazy: true,
      body: {
        sync_job_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    list,
    get,
    start,
    stop,
  };
};
