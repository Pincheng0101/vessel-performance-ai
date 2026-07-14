import { ListConstant } from '~/constants';
import {
  DatasetItem,
  DatasetItemCreateResponse,
  DatasetItemDeleteResponse,
  DatasetItemListResponse,
  DatasetItemSyncResponse,
  DatasetItemUpdateResponse,
} from '~/models/server/datasetItem';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function datasetItem({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<DatasetItemListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    datasetId: dataset_id,
    datasetItemIds: dataset_item_ids,
    limit = ListConstant.DefaultParams.PER_PAGE,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/list-dataset-items', {
      watch: false,
      lazy,
      signal,
      body: {
        dataset_id,
        dataset_item_ids,
        limit,
        next_token,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemListResponse(finalResponse._data);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {DatasetItem} item
   * @returns {AsyncData<DatasetItemCreateResponse, H3Error<ErrorResponse>>}
   */
  const create = (item) => {
    return client.post('/resource/create-dataset-items', {
      watch: false,
      lazy: true,
      body: DatasetItem.toRequestPayload(item),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemCreateResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {DatasetItem} item
   * @returns {AsyncData<DatasetItemUpdateResponse, H3Error<ErrorResponse>>}
   */
  const update = (item) => {
    return client.post('/resource/update-dataset-items', {
      watch: false,
      lazy: true,
      body: DatasetItem.toRequestPayload(item),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemUpdateResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<DatasetItemDeleteResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    datasetId: dataset_id,
    datasetItemIds: dataset_item_ids,
  } = {}) => {
    return client.post('/resource/delete-dataset-items', {
      watch: false,
      lazy: true,
      body: {
        dataset_id,
        dataset_item_ids,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemDeleteResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<DatasetItemSyncResponse, H3Error<ErrorResponse>>}
   */
  const startSync = (item) => {
    return client.post('/resource/start-sync-dataset-items', {
      watch: false,
      lazy: true,
      body: DatasetItem.toSyncRequestPayload(item),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemSyncResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<DatasetItemSyncResponse, H3Error<ErrorResponse>>}
   */
  const getSync = ({
    executionArn: execution_arn,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/resource/get-sync-dataset-items', {
      watch: false,
      lazy,
      body: {
        execution_arn,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetItemSyncResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
    create,
    update,
    destroy,
    startSync,
    getSync,
  };
}
